import { drizzle } from "drizzle-orm/sqlite-proxy";
import { required } from "../cloudflare";
import * as schema from "./schema";

// D1 over its HTTP API, for the Netlify deployment that has no bindings. Every query is an
// API round trip, so this is a stopgap for staging and not a way to serve the school.
//
// `/raw` rather than `/query`: it answers with a `columns` list and rows as arrays of
// values, which is the shape sqlite-proxy wants. `/query` returns each row as an object
// keyed by column name, and seven query modules join a table to itself through `alias()`,
// where two columns share a name and one would silently overwrite the other.
type RawResult = { results?: { columns?: string[]; rows?: unknown[][] } };
type RawResponse = {
  success: boolean;
  errors?: { code: number; message: string }[];
  result?: RawResult[];
};

type Method = "run" | "all" | "values" | "get";

// `get` wants the row itself, and `undefined` when there is none: drizzle treats any truthy
// value as a row, so an empty array here would turn a miss into an object of undefined
// fields — a `findFirst` that never returns null.
function shape(result: RawResult | undefined, method: Method) {
  const rows = (result?.results?.rows ?? []) as unknown[][];
  return { rows: method === "get" ? rows[0] : rows };
}

export function httpDb() {
  const account = required("CLOUDFLARE_ACCOUNT_ID");
  const database = required("CLOUDFLARE_DATABASE_ID");
  const token = required("CLOUDFLARE_D1_TOKEN");
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/raw`;

  async function post(body: unknown): Promise<RawResult[]> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload: RawResponse = await response.json();
    if (!response.ok || !payload.success) {
      const detail = payload.errors?.map((e) => `${e.code} ${e.message}`).join("; ");
      throw new Error(`D1 rejected a query (${response.status}): ${detail ?? "no detail"}`);
    }
    return payload.result ?? [];
  }

  // Both callbacks *and* the config, in that order, because `drizzle` reads `casing` off its
  // third argument before working out whether the second one was the config. Called as
  // `drizzle(callback, config)` it silently drops the casing and renders every column as its
  // camelCase property name, which no column in this schema is; called with `undefined` in
  // between it drops the schema instead. Only this shape carries both.
  return drizzle(
    async (sql, params, method) => shape((await post({ sql, params }))[0], method),
    async (queries) => {
      const results = await post({
        batch: queries.map(({ sql, params }) => ({ sql, params })),
      });
      return queries.map((query, i) => shape(results[i], query.method));
    },
    { schema, casing: "snake_case" },
  );
}
