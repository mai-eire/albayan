export type UploadedFile = { storageKey: string; mimeType: string; sizeBytes: number };

// Sends a file through the Worker (/api/files, never a presigned URL) and returns what
// a resource needs to record about it.
export async function uploadFile(
  file: File,
): Promise<{ ok: true; file: UploadedFile } | { ok: false; error: string }> {
  const response = await fetch("/api/files", {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": file.name,
    },
    body: file,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return {
      ok: false,
      error: body?.error ?? "We couldn't upload the file — check your connection and try again.",
    };
  }
  const uploaded = (await response.json()) as { key: string; size: number; contentType: string };
  return {
    ok: true,
    file: { storageKey: uploaded.key, mimeType: uploaded.contentType, sizeBytes: uploaded.size },
  };
}
