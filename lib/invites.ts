import { eq } from "drizzle-orm";
import type { Auth } from "./auth";
import type { Db } from "./db";
import { users } from "./db/schema";

// Staff invites: admin creates the user (status "invited", no password) and emails a link
// whose token lives in Better Auth's verifications table. Accepting sets the password.

const ttlMs = 7 * 24 * 60 * 60 * 1000;

export async function createInvite(auth: Auth, userId: number): Promise<string> {
  const ctx = await auth.$context;
  const token = crypto.randomUUID().replace(/-/g, "");
  await ctx.internalAdapter.createVerificationValue({
    identifier: `invite:${token}`,
    value: String(userId),
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return token;
}

export async function findInvite(auth: Auth, db: Db, token: string) {
  const ctx = await auth.$context;
  const row = await ctx.internalAdapter.findVerificationValue(`invite:${token}`);
  if (!row || row.expiresAt < new Date()) return null;
  const user = await db.query.users.findFirst({
    columns: { id: true, name: true, email: true, status: true },
    where: eq(users.id, Number(row.value)),
  });
  return user ?? null;
}

// Sets the password, activates the user and consumes the token. Returns the user so the
// caller can sign them in.
export async function acceptInvite(auth: Auth, db: Db, token: string, password: string) {
  const user = await findInvite(auth, db, token);
  if (!user) return null;
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const userId = String(user.id);
  const existing = await ctx.internalAdapter.findCredentialAccount(userId);
  if (existing) {
    await ctx.internalAdapter.updatePassword(userId, hash);
  } else {
    await ctx.internalAdapter.linkAccount({
      userId,
      providerId: "credential",
      accountId: userId,
      password: hash,
    });
  }
  await db
    .update(users)
    .set({ status: "active", emailVerified: true })
    .where(eq(users.id, user.id));
  await ctx.internalAdapter.deleteVerificationByIdentifier(`invite:${token}`);
  return user;
}
