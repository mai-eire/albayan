import { headers } from "next/headers";

// The app's own origin: BETTER_AUTH_URL in production; in dev, whatever host the request
// came in on, so `pnpm dev -p 3001` and the e2e server both get working links in emails.
export async function appOrigin(): Promise<string> {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function appUrl(path: string): Promise<string> {
  return new URL(path, await appOrigin()).toString();
}
