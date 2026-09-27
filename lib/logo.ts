// The school's logo is served from one public route. The stored key goes in the query so
// a freshly uploaded logo is seen at once instead of after the cache expires.
export function logoUrl(logoKey: string | null | undefined): string | null {
  if (!logoKey) return null;
  const version = logoKey.split("/")[1] ?? "1";
  return `/api/logo?v=${encodeURIComponent(version)}`;
}

// What an admin may upload. No SVG-by-default worry: the route sandboxes it (app/api/logo).
export const logoTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
export const maxLogoBytes = 2 * 1024 * 1024;
