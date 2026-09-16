import type { z } from "zod";
import { AccessDenied } from "./access";
import { getCurrentUser, type CurrentUser } from "./current-user";
import { db, type Db } from "./db";

export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

type Context = { user: CurrentUser; db: Db };

// A handler's own "no": shown to the person as the form error, not thrown to Next.
export class ActionError extends Error {}

// Every write is a server action shaped like this: Zod parse → handler (which does its own
// access check with lib/access, then writes, audits, notifies) → a typed result the form
// can show. Anything unexpected still throws, so Next reports it.
export function action<Schema extends z.ZodType, Output>(
  schema: Schema,
  handler: (input: z.output<Schema>, ctx: Context) => Promise<Output>,
) {
  return async (raw: unknown): Promise<ActionResult<Output>> => {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Your session has ended. Sign in again." };
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        fieldErrors[path] ??= issue.message;
      }
      return { ok: false, error: "Check the highlighted fields.", fieldErrors };
    }
    try {
      return { ok: true, data: await handler(parsed.data, { user, db: await db() }) };
    } catch (error) {
      if (error instanceof AccessDenied || error instanceof ActionError) {
        return { ok: false, error: error.message };
      }
      throw error;
    }
  };
}
