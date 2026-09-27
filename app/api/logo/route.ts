export const dynamic = "force-dynamic";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { getFile } from "@/lib/storage/bucket";

// The one file anyone may fetch without signing in: the school's logo, which the login
// page shows before there is a session. It can only ever serve the key held in settings,
// so nothing else in the bucket is reachable from here.
//
// The sandbox CSP matters for SVG: an SVG opened directly at this URL would otherwise be
// a same-origin document that can run script. Sandboxed, it cannot, and an <img> renders
// it either way.
const guard =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox; frame-ancestors 'none'";

export async function GET(request: Request) {
  const { logoKey } = await getSchoolSettings();
  if (!logoKey) return new Response("Not found", { status: 404 });
  const file = await getFile(logoKey);
  if (!file) return new Response("Not found", { status: 404 });
  if (request.headers.get("if-none-match") === file.etag) {
    return new Response(null, { status: 304, headers: { etag: file.etag } });
  }
  return new Response(file.body, {
    headers: {
      "content-type": file.contentType,
      "content-length": String(file.size),
      etag: file.etag,
      // The URL carries the key, so a new logo is a new URL; this only caches the old one.
      "cache-control": "public, max-age=300",
      "content-security-policy": guard,
      "x-content-type-options": "nosniff",
    },
  });
}
