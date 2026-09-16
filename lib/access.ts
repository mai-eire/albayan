import { redirect } from "next/navigation";
import { getCurrentUser, type Area, type CurrentUser } from "./current-user";

// The authorisation layer. Route guards here; per-object rules follow in task 9.

// Signed in, password not pending a change, else off to the right page.
export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  if (user.mustChangePassword) redirect("/change-password");
  return user;
}

// Used by the area layouts: a teacher opening /admin lands on their own area instead.
export async function requireArea(area: Area): Promise<CurrentUser> {
  const user = await requireUser(`/${area}`);
  if (!user.areas.includes(area)) redirect(user.areas[0] ? `/${user.areas[0]}` : "/");
  return user;
}
