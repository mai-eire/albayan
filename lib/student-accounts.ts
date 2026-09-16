import type { Auth } from "./auth";
import type { Db } from "./db";
import { users } from "./db/schema";
import { temporaryPassword } from "./passwords";

// A student signs in with their student ID; the synthetic email keeps Better Auth happy
// until they add a real one. The temporary password is returned once, for the guardian.
export async function createStudentAccount(
  auth: Auth,
  db: Db,
  { studentId, name }: { studentId: string; name: string },
) {
  const password = temporaryPassword();
  const ctx = await auth.$context;
  const [user] = await db
    .insert(users)
    .values({
      name,
      email: `${studentId.toLowerCase()}@students.invalid`,
      username: studentId.toLowerCase(),
      displayUsername: studentId,
      mustChangePassword: true,
    })
    .returning({ id: users.id });
  await ctx.internalAdapter.linkAccount({
    userId: String(user.id),
    providerId: "credential",
    accountId: String(user.id),
    password: await ctx.password.hash(password),
  });
  return { userId: user.id, password };
}
