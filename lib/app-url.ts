import { headers } from "next/headers";

// Absolute URL for links in emails. BETTER_AUTH_URL in production; in dev, whatever host
// the request came in on (so `pnpm dev -p 3001` and the e2e server both get working links).
export async function appUrl(path: string): Promise<string> {
  const base = process.env.BETTER_AUTH_URL ?? (await originFromRequest());
  return new URL(path, base).toString();
}

async function originFromRequest() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
