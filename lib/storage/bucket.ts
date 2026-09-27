import { getCloudflareContext } from "@opennextjs/cloudflare";

// The private R2 bucket (Miniflare's local emulation under .wrangler/state in dev).
// Files always go through /api/files, never via presigned URLs.

export const maxFileBytes = 25 * 1024 * 1024;

export type StoredFile = {
  key: string;
  size: number;
  contentType: string;
  etag: string;
  body: ReadableStream;
};

async function bucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  return env.BUCKET;
}

export async function putFile(key: string, data: ArrayBuffer, contentType: string): Promise<void> {
  await (await bucket()).put(key, data, { httpMetadata: { contentType } });
}

// What was stored, without fetching it: used to check an upload is the right sort of
// file before anything records its key.
export async function fileFacts(
  key: string,
): Promise<{ size: number; contentType: string } | null> {
  const object = await (await bucket()).head(key);
  if (!object) return null;
  return {
    size: object.size,
    contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
  };
}

export async function getFile(key: string): Promise<StoredFile | null> {
  const object = await (await bucket()).get(key);
  if (!object) return null;
  return {
    key,
    size: object.size,
    contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
    etag: object.httpEtag,
    body: object.body,
  };
}

export async function deleteFile(key: string): Promise<void> {
  await (await bucket()).delete(key);
}

// "My Report.PDF" → "my-report.pdf"; keeps the extension, drops anything odd.
export function safeFilename(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return cleaned.slice(0, 100) || "file";
}
