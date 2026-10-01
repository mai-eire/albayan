import { AwsClient } from "aws4fetch";
import { bindings, required } from "../cloudflare";

// The private R2 bucket (Miniflare's local emulation under .wrangler/state in dev).
// Files always go through /api/files, never via presigned URLs.
//
// On Netlify there is no binding, so the same bucket is reached over R2's S3 API. Only
// these four operations are needed, so the seam is four functions rather than a shim
// pretending to be an R2Bucket.

export const maxFileBytes = 25 * 1024 * 1024;

export type StoredFile = {
  key: string;
  size: number;
  contentType: string;
  etag: string;
  body: ReadableStream;
};

type Facts = { size: number; contentType: string };

type Store = {
  put(key: string, data: ArrayBuffer, contentType: string): Promise<void>;
  facts(key: string): Promise<Facts | null>;
  get(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
};

function bindingStore(r2: R2Bucket): Store {
  return {
    put: async (key, data, contentType) => {
      await r2.put(key, data, { httpMetadata: { contentType } });
    },
    facts: async (key) => {
      const object = await r2.head(key);
      if (!object) return null;
      return {
        size: object.size,
        contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
      };
    },
    get: async (key) => {
      const object = await r2.get(key);
      if (!object) return null;
      return {
        key,
        size: object.size,
        contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
        etag: object.httpEtag,
        body: object.body,
      };
    },
    delete: async (key) => r2.delete(key),
  };
}

// The jurisdiction is part of the hostname, not a header: these buckets enforce `eu`, so
// the plain account endpoint cannot see them at all.
function s3Store(): Store {
  const account = required("CLOUDFLARE_ACCOUNT_ID");
  const bucket = required("R2_BUCKET");
  const client = new AwsClient({
    service: "s3",
    region: "auto",
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
  });
  const url = (key: string) =>
    `https://${account}.eu.r2.cloudflarestorage.com/${bucket}/` +
    key.split("/").map(encodeURIComponent).join("/");

  const headers = (response: Response) => ({
    size: Number(response.headers.get("content-length") ?? 0),
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
  });

  return {
    put: async (key, data, contentType) => {
      const response = await client.fetch(url(key), {
        method: "PUT",
        body: data,
        headers: { "content-type": contentType },
      });
      if (!response.ok) throw new Error(`R2 refused the upload (${response.status})`);
    },
    facts: async (key) => {
      const response = await client.fetch(url(key), { method: "HEAD" });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`R2 refused a HEAD (${response.status})`);
      return headers(response);
    },
    get: async (key) => {
      const response = await client.fetch(url(key));
      if (response.status === 404) return null;
      if (!response.ok || !response.body) {
        throw new Error(`R2 refused a GET (${response.status})`);
      }
      return {
        key,
        ...headers(response),
        etag: response.headers.get("etag") ?? "",
        body: response.body,
      };
    },
    delete: async (key) => {
      const response = await client.fetch(url(key), { method: "DELETE" });
      // S3 deletes are idempotent; 404 is not an error worth raising.
      if (!response.ok && response.status !== 404) {
        throw new Error(`R2 refused a DELETE (${response.status})`);
      }
    },
  };
}

let overHttp: Store | undefined;

async function store(): Promise<Store> {
  const env = await bindings();
  if (env) return bindingStore(env.BUCKET);
  return (overHttp ??= s3Store());
}

export async function putFile(key: string, data: ArrayBuffer, contentType: string): Promise<void> {
  await (await store()).put(key, data, contentType);
}

// What was stored, without fetching it: used to check an upload is the right sort of
// file before anything records its key.
export async function fileFacts(key: string): Promise<Facts | null> {
  return (await store()).facts(key);
}

export async function getFile(key: string): Promise<StoredFile | null> {
  return (await store()).get(key);
}

export async function deleteFile(key: string): Promise<void> {
  await (await store()).delete(key);
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
