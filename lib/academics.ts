// "2026-27" from the start date: the year's name is its key and never changes.
export function yearIdFor(startDate: string): string {
  const start = Number(startDate.slice(0, 4));
  return `${start}-${String(start + 1).slice(2)}`;
}
