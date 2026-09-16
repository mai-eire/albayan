"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { acceptInvite } from "@/lib/invites";
import { passwordSchema } from "@/lib/passwords";

// These predate the action() helper of task 10 and will move onto it.

type Result = { ok: true } | { error: string };

export async function acceptInviteAction(token: string, password: string): Promise<Result> {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const a = await auth();
  const user = await acceptInvite(a, await db(), token, parsed.data);
  if (!user) return { error: "This invite link is no longer valid. Ask the office for a new one." };
  await a.api.signInEmail({
    body: { email: user.email, password: parsed.data },
    headers: await headers(),
  });
  redirect("/");
}

export async function changePasswordAction(current: string, next: string): Promise<Result> {
  const parsed = passwordSchema.safeParse(next);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const a = await auth();
  const session = await a.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  try {
    await a.api.changePassword({
      body: { currentPassword: current, newPassword: parsed.data, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch {
    return { error: "Your current password wasn't right. Try again." };
  }
  await (
    await db()
  )
    .update(users)
    .set({ mustChangePassword: false })
    .where(eq(users.id, Number(session.user.id)));
  redirect("/");
}
