import { isStaff } from "@/lib/access";
import { getCurrentUser } from "@/lib/current-user";
import { maxFileBytes, putFile, safeFilename } from "@/lib/storage/bucket";

// Upload: raw body, Content-Type and X-File-Name headers. Returns the key that the
// createResource action then stores; until that row exists only admin can fetch it.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to upload files." }, { status: 401 });
  if (!isStaff(user)) return Response.json({ error: "You can't upload files." }, { status: 403 });

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxFileBytes) return tooLarge();
  const filename = safeFilename(request.headers.get("x-file-name") ?? "file");
  const contentType = request.headers.get("content-type") ?? "application/octet-stream";
  const data = await request.arrayBuffer();
  if (data.byteLength === 0) return Response.json({ error: "The file is empty." }, { status: 400 });
  if (data.byteLength > maxFileBytes) return tooLarge();

  const key = `uploads/${crypto.randomUUID()}/${filename}`;
  await putFile(key, data, contentType);
  return Response.json({ key, size: data.byteLength, contentType }, { status: 201 });
}

function tooLarge() {
  return Response.json({ error: "Files can be up to 25 MB." }, { status: 413 });
}
