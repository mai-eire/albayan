import { cookies } from "next/headers";
import { devClockCookie } from "./dev-clock";

// The server's idea of "now". In development a `dev-today` cookie (set from the clock in
// the header) moves the date so the app can be seen as on any day; the time of day stays
// real. Production ignores the cookie. Record timestamps (created, published, read) always
// use the real clock — this is for "today" logic only.
export async function clock(): Promise<Date> {
  const real = new Date();
  if (process.env.NODE_ENV === "production") return real;
  let value: string | undefined;
  try {
    value = (await cookies()).get(devClockCookie)?.value;
  } catch {
    // Outside a request (tests, scripts) there is no cookie jar.
    return real;
  }
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return real;
  return new Date(`${value}T${real.toISOString().slice(11)}`);
}
