"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { guardians } from "@/lib/db/schema";
import { passwordSchema } from "@/lib/passwords";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().min(6, "Enter a phone number we can reach you on").max(30),
  password: passwordSchema,
});

export type RegisterInput = z.input<typeof schema>;

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

// Anonymous by design, so not on action(): parse → create the user and guardian row → send
// the verification email → sign in (the cookie comes back via nextCookies) → /family.
export async function registerGuardian(raw: unknown): Promise<Result> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }
  const { name, email, phone, password } = parsed.data;
  const a = await auth();
  const h = await headers();
  let userId: number;
  try {
    const { user } = await a.api.signUpEmail({
      body: { name, email, password, phone },
      headers: h,
    });
    userId = Number(user.id);
  } catch (error) {
    if (error instanceof APIError && error.body?.code?.startsWith("USER_ALREADY_EXISTS")) {
      return {
        ok: false,
        error: "There's already an account with that email. Sign in, or reset your password.",
      };
    }
    throw error;
  }
  await (await db()).insert(guardians).values({ userId });
  await a.api.sendVerificationEmail({ body: { email, callbackURL: "/family" }, headers: h });
  redirect("/family");
}

export async function resendVerification(): Promise<Result> {
  const a = await auth();
  const h = await headers();
  const session = await a.api.getSession({ headers: h });
  if (!session) return { ok: false, error: "Your session has ended. Sign in again." };
  if (session.user.emailVerified) return { ok: true };
  await a.api.sendVerificationEmail({
    body: { email: session.user.email, callbackURL: "/family" },
    headers: h,
  });
  return { ok: true };
}
