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
type RawResponse = {
  success: boolean;
  errors?: { code: number; message: string }[];
  result?: { results?: { columns?: string[]; rows?: unknown[][] } }[];
};

export function httpDb() {
  const account = required("CLOUDFLARE_ACCOUNT_ID");
  const database = required("CLOUDFLARE_DATABASE_ID");
  const token = required("CLOUDFLARE_D1_TOKEN");
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/raw`;

  return drizzle(
    async (sql, params, method) => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ sql, params }),
      });
      const body: RawResponse = await response.json();
      if (!response.ok || !body.success) {
        const detail = body.errors?.map((e) => `${e.code} ${e.message}`).join("; ");
        throw new Error(`D1 rejected a query (${response.status}): ${detail ?? "no detail"}`);
      }
      const rows = (body.result?.[0]?.results?.rows ?? []) as unknown[][];
      // `get` wants the row itself, and `undefined` when there is none: drizzle treats any
      // truthy value as a row, so an empty array here would turn a miss into an object of
      // undefined fields — a `findFirst` that never returns null.
      return { rows: method === "get" ? rows[0] : rows };
    },
    { schema, casing: "snake_case" },
  );
}
