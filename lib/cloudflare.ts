import { getCloudflareContext } from "@opennextjs/cloudflare";

// Normally this app is one Cloudflare Worker and D1 and R2 arrive as bindings. While
// Netlify stands in for the domain (docs/PHASE-3.md), the same code runs with no bindings
// at all and has to reach the same staging resources over Cloudflare's HTTP APIs. This
// module is the only place that decides which of the two it is.

// `SITE_ID` is set by Netlify itself and is one of only three of its automatic variables
// that reach a function at runtime (`URL` and `SITE_NAME` are the others). Detecting the
// host this way rather than asking for a variable removes the mistake it is easiest to
// make: `NETLIFY=true` is reserved *and* build-only, and anything in `netlify.toml` or
// scoped to Builds never reaches the function either, so a deployment can look configured
// and not be. `DATA_TRANSPORT=http` stays as an explicit override for anywhere else.
function overHttp(): boolean {
  // Dev, `vitest` (NODE_ENV=test) and the e2e server (WRANGLER_STATE) always use bindings.
  // Never the token: it reads and writes the real staging database.
  if (process.env.NODE_ENV !== "production" || process.env.WRANGLER_STATE) return false;
  return process.env.DATA_TRANSPORT === "http" || Boolean(process.env.SITE_ID);
}

// The bindings, or null when this deployment has none and must go over HTTP.
export async function bindings(): Promise<{ DB: D1Database; BUCKET: R2Bucket } | null> {
  if (overHttp()) return null;
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env;
  } catch (cause) {
    // Off-Worker this fails by trying to import wrangler, which is not in a deployed
    // bundle: `ERR_MODULE_NOT_FOUND: wrangler`, which says nothing about the real mistake.
    throw new Error(
      "No Cloudflare bindings here, and nothing asked for the HTTP transport. On a host " +
        "other than Netlify set DATA_TRANSPORT=http; on Netlify this should not happen, " +
        "since SITE_ID is automatic.",
      { cause },
    );
  }
}

export function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} must be set when running off Cloudflare Workers. On Netlify, set it on the ` +
        `site with its scope including Functions: values in netlify.toml, and variables ` +
        `scoped to Builds only, never reach the function at runtime.`,
    );
  }
  return value;
}
