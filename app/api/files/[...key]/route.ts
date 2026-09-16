import { requireAdmin } from "@/lib/access";
import { getCurrentUser } from "@/lib/current-user";
import { getFile } from "@/lib/storage/bucket";

type Props = { params: Promise<{ key: string[] }> };

// Download: streams the object through the Worker after the access check. Admin-only
// until resources exist (Phase 2 replaces this with canViewResource).
export async function GET(request: Request, { params }: Props) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in to open files.", { status: 401 });
  try {
    requireAdmin(user);
  } catch {
    return new Response("You can't open this file.", { status: 403 });
  }

  const { key } = await params;
  const file = await getFile(key.join("/"));
  if (!file) return new Response("Not found", { status: 404 });
  if (request.headers.get("if-none-match") === file.etag)
    return new Response(null, { status: 304 });

  const filename = key[key.length - 1];
  return new Response(file.body, {
    headers: {
      "content-type": file.contentType,
      "content-length": String(file.size),
      etag: file.etag,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, max-age=3600",
    },
  });
}
