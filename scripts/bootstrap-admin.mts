import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { getPlatformProxy } from "wrangler";
import { createAuth } from "@/lib/auth";
import { dbFor } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { temporaryPassword } from "@/lib/passwords";

// pnpm bootstrap-admin --email amina@example.com --name "Amina Khan" [--password …]
// Creates the first admin on the local database, or promotes an existing user. Idempotent.
// For staging/production run it with --remote after `wrangler login` (task 14).

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    password: { type: "string" },
    remote: { type: "boolean", default: false },
  },
});

if (!values.email || !values.name) {
  console.error(
    'Usage: pnpm bootstrap-admin --email <email> --name "<name>" [--password <password>]',
  );
  process.exit(1);
}
if (values.remote) {
  console.error("--remote is not wired up until the Cloudflare resources exist (Phase 0 task 14).");
  process.exit(1);
}

process.env.BETTER_AUTH_URL ??= "http://localhost:3000";

const proxy = await getPlatformProxy<CloudflareEnv>();
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
    body: { email: values.email, name: values.name, password },
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
