import { canViewResource, loadResourceViewer } from "@/lib/access";
import { getResourceFactsByKey } from "@/lib/db/queries/resources";
import { getCurrentUser } from "@/lib/current-user";
import { getFile } from "@/lib/storage/bucket";

type Props = { params: Promise<{ key: string[] }> };

// Download: streams the object through the Worker after the access check on the
// resource that owns the key (canViewResource). A key with no resource yet is admin-only.
export async function GET(request: Request, { params }: Props) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in to open files.", { status: 401 });
  const { key } = await params;
  const facts = await getResourceFactsByKey(key.join("/"));
  const allowed = facts
    ? canViewResource(user, facts, await loadResourceViewer(user))
    : user.isAdmin;
  if (!allowed) return new Response("You can't open this file.", { status: 403 });

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
