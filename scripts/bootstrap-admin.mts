import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { getPlatformProxy } from "wrangler";
import { createAuth } from "@/lib/auth";
import { dbFor } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { temporaryPassword } from "@/lib/passwords";

// pnpm bootstrap-admin --email amina@example.com --name "Amina Khan" [--password …]
// Creates the first admin on the local database, or promotes an existing user. Idempotent.
//
// pnpm bootstrap-admin --email amina@example.com --remote [--env staging]
// Promotes someone who has already registered on the deployed site. It cannot create an
// account: making one means hashing a password the way Better Auth does, and a script that
// copies that by hand goes quietly wrong the day Better Auth changes it. Registering through
// the site uses the same code path the school will, which is the point of a first deploy.

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    password: { type: "string" },
    remote: { type: "boolean", default: false },
    env: { type: "string" },
  },
});

if (!values.email || (!values.remote && !values.name)) {
  console.error(
    'Usage: pnpm bootstrap-admin --email <email> --name "<name>" [--password <password>]\n' +
      "       pnpm bootstrap-admin --email <email> --remote [--env staging]",
  );
  process.exit(1);
}

// SQLite string literals escape only the quote, and `wrangler d1 execute` takes no bound
// parameters, so this is the whole of it.
function sqlText(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function d1(sql: string): Array<Record<string, unknown>> {
  const args = ["exec", "wrangler", "d1", "execute", "DB"];
  if (values.env) args.push("--env", values.env);
  args.push("--remote", "-y", "--json", "--command", sql);
  let out: string;
  try {
    out = execFileSync("pnpm", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    const { stderr, stdout } = error as { stderr?: string; stdout?: string };
    console.error(stderr?.trim() || stdout?.trim() || String(error));
    process.exit(1);
  }
  // Wrangler prints its banner before the JSON.
  const parsed = JSON.parse(out.slice(out.indexOf("[")));
  return parsed[0]?.results ?? [];
}

if (values.remote) {
  const where = `where email = ${sqlText(values.email)}`;
  const [found] = d1(`select id, is_admin from users ${where}`);
  if (!found) {
    console.error(
      `No account for ${values.email} on the ${values.env ?? "production"} database.\n` +
        "Register on the deployed site first, then run this again to make that account an admin.",
    );
    process.exit(1);
  }
  if (found.is_admin) {
    console.log(`${values.email} is already an admin.`);
  } else {
    // Verified too: on a first deploy the email provider is usually not configured yet, and
    // an admin who cannot receive the verification link cannot verify themselves.
    d1(`update users set is_admin = 1, email_verified = 1 ${where}`);
    console.log(`${values.email} is now an admin on ${values.env ?? "production"}.`);
  }
  process.exit(0);
}

process.env.BETTER_AUTH_URL ??= "http://localhost:3000";

const proxy = await getPlatformProxy<CloudflareEnv>({
  persist: process.env.WRANGLER_STATE ? { path: process.env.WRANGLER_STATE } : undefined,
});
const db = dbFor(proxy.env.DB);
const auth = createAuth(db, { schoolName: async () => "Al-Bayan" });

const existing = await db.query.users.findFirst({ where: eq(users.email, values.email) });
if (existing) {
  if (!existing.isAdmin) {
    await db.update(users).set({ isAdmin: true }).where(eq(users.id, existing.id));
    console.log(`${values.email} is now an admin.`);
  } else {
    console.log(`${values.email} is already an admin.`);
  }
} else {
  const generated = !values.password;
  const password = values.password ?? temporaryPassword();
  const { user } = await auth.api.signUpEmail({
    body: { email: values.email, name: values.name!, password },
  });
  await db
    .update(users)
    .set({ isAdmin: true, emailVerified: true, mustChangePassword: generated })
    .where(eq(users.id, Number(user.id)));
  console.log(
    `Created admin ${values.email}${generated ? ` with temporary password: ${password}` : ""}`,
  );
}

await proxy.dispose();
