import type { ArabicProficiency, RegistrationReason, Relationship } from "@/lib/db/schema";

// Option lists shared by the application wizard, the admin profiles and the reports.
// Stored values are the keys; the labels are what families see.

export const preferNotToSay = "Prefer not to say";

export const ethnicities = [
  "Arab",
  "Asian – Pakistani",
  "Asian – Bangladeshi",
  "Asian – Indian",
  "Asian – other",
  "Black – African",
  "Black – other",
  "White – Irish",
  "White – other",
  "Mixed",
  "Other",
];

// Irish mainstream school years; stored as the label.
export const yearGroups = [
  "Not yet in school",
  "Junior infants",
  "Senior infants",
  "1st class",
  "2nd class",
  "3rd class",
  "4th class",
  "5th class",
  "6th class",
  "1st year",
  "2nd year",
  "3rd year",
  "4th year",
  "5th year",
  "6th year",
];

export const proficiencyLabels: Record<ArabicProficiency, string> = {
  none: "None yet",
  beginner: "Beginner – knows some letters",
  intermediate: "Can read simple words",
  advanced: "Reads and writes confidently",
  native: "Speaks Arabic at home",
};

export const relationshipLabels: Record<Relationship, string> = {
  mother: "Mother",
  father: "Father",
  guardian: "Guardian",
  grandparent: "Grandparent",
  other: "Other",
};

export const reasonLabels: Record<RegistrationReason, string> = {
  arabic: "To learn Arabic",
  quran: "To learn Quran",
  religion: "Islamic education",
  mosque: "To be part of the mosque",
  community: "Community and friendships",
  other: "Something else",
};

export const commonLanguages = [
  "Arabic",
  "English",
  "Urdu",
  "Somali",
  "Bengali",
  "Kurdish",
  "Turkish",
  "French",
  "Malay",
  "Pashto",
];

// Eircode routing key ("D15 AB12" → "D15"), the only part of the address the reports use.
export function routingKey(postalCode: string): string | null {
  const key = postalCode
    .trim()
    .toUpperCase()
    .match(/^[A-Z]\d{2}|^D6W/)?.[0];
  return key ?? null;
}
