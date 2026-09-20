import type { ResourceRow } from "@/lib/db/queries/resources";
import type { Attachment } from "./HomeworkForm";

// Files and links by homework id, for the edit form.
export function groupAttachments(resources: ResourceRow[]): Record<number, Attachment[]> {
  const out: Record<number, Attachment[]> = {};
  for (const r of resources) {
    if (r.homeworkId === null) continue;
    (out[r.homeworkId] ??= []).push({ id: r.id, title: r.title, kind: r.kind });
  }
  return out;
}
