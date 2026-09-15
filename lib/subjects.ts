// A subject has one colour everywhere (docs/DESIGN.md §2.1). Subjects added later
// take a colour from the rotation, chosen by id so it is stable across screens.
const fixed: Record<string, string> = {
  quran: "lapis",
  arabic: "tile",
  islamic_studies: "plum",
};

const rotation = ["indigo", "teal", "grape", "cyan", "orange"];

export function subjectColor(subjectId: string): string {
  const known = fixed[subjectId];
  if (known) return known;
  let hash = 0;
  for (const ch of subjectId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return rotation[hash % rotation.length];
}
