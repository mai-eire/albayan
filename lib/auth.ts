import { getCloudflareContext } from "@opennextjs/cloudflare";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { dbFor, type Db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { appOrigin } from "@/lib/app-url";
import { sendPasswordReset, sendVerifyEmail } from "@/lib/email";

// baseURL is optional for scripts and tests, which set BETTER_AUTH_URL instead.
type Options = { schoolName: () => Promise<string>; baseURL?: string };

// Email + password, with the student ID as username. Sessions are DB-backed cookies.
export function createAuth(db: Db, { schoolName, baseURL }: Options) {
  return betterAuth({
    appName: "Al-Bayan",
    // Server-side api calls (register, resend) build links from this; the handler would
    // otherwise infer it per request and the actions get nothing.
    baseURL,
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    user: {
      modelName: "users",
      additionalFields: {
        phone: { type: "string", required: false },
        isAdmin: { type: "boolean", required: false, defaultValue: false, input: false },
        status: { type: "string", required: false, defaultValue: "active", input: false },
        mustChangePassword: { type: "boolean", required: false, defaultValue: false, input: false },
        lastLoginAt: { type: "string", required: false, input: false },
      },
    },
    session: { modelName: "sessions" },
    account: { modelName: "accounts" },
    verification: { modelName: "verifications" },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url }) =>
        sendPasswordReset({ email: user.email, name: user.name }, url, await schoolName()),
    },
    // Guardians verify their email before applying for a child; the register action sends
    // the first email, /family offers a resend. Nothing else needs verification.
    emailVerification: {
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) =>
        sendVerifyEmail({ email: user.email, name: user.name }, url, await schoolName()),
    },
    advanced: { database: { generateId: "serial" } },
    plugins: [
      // Student IDs ("ALB-26-0042") are usernames; case-insensitive, hyphens allowed.
      username({
        minUsernameLength: 3,
        usernameValidator: (value) => /^[a-z0-9_.-]+$/i.test(value),
      }),
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type SessionUser = Auth["$Infer"]["Session"]["user"];

const instances = new WeakMap<D1Database, Auth>();

// One instance per D1 binding (one per Worker isolate in production, one in dev).
export async function auth(): Promise<Auth> {
  const { env } = await getCloudflareContext({ async: true });
  let instance = instances.get(env.DB);
  if (!instance) {
    instance = createAuth(dbFor(env.DB), {
      baseURL: await appOrigin(),
      schoolName: async () =>
        (await import("@/lib/db/queries/settings")).getSchoolSettings().then((s) => s.name),
    });
    instances.set(env.DB, instance);
  }
  return instance;
}
