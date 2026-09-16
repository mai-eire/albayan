// "2026-27" from the start date: the year's name is its key and never changes.
export function yearIdFor(startDate: string): string {
  const start = Number(startDate.slice(0, 4));
  return `${start}-${String(start + 1).slice(2)}`;
}

// "Islamic Studies" → "islamic_studies": the subject's code is its key and never changes.
export function subjectIdFor(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
