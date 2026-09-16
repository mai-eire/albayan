import type { NoteCategory, NoteVisibility } from "@/lib/db/schema";

export const categoryLabels: Record<NoteCategory, string> = {
  general: "General",
  praise: "Praise",
  concern: "Concern",
  behaviour: "Behaviour",
};

// Note categories map onto the status colours (§2.1): praise good, concern warning,
// behaviour attention, general neutral.
export const categoryColors: Record<NoteCategory, string> = {
  general: "gray",
  praise: "tile",
  concern: "saffron",
  behaviour: "clay",
};

export const visibilityLabels: Record<NoteVisibility, string> = {
  staff: "Staff only",
  guardians: "Family",
  guardians_and_student: "Family and student",
};
