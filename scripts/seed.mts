import { getPlatformProxy } from "wrangler";
import { createAuth } from "@/lib/auth";
import { dbFor } from "@/lib/db";
import { seed } from "@/lib/db/seed";

// pnpm db:seed — fills the local database with the demo school (resets first).
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
const started = Date.now();
const proxy = await getPlatformProxy<CloudflareEnv>();
const db = dbFor(proxy.env.DB);
await seed(db, createAuth(db, { schoolName: async () => "Al-Bayan" }));
console.log(
  `Seeded in ${((Date.now() - started) / 1000).toFixed(1)}s. Sign in as admin@example.com / password (teachers: teacher1@example.com…, parents: parent2@example.com…, students: ALB-26-0001…).`,
);
await proxy.dispose();
