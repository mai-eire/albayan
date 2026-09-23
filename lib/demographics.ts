import {
  relationships,
  type ArabicProficiency,
  type GuardianGender,
  type RegistrationReason,
  type Relationship,
} from "@/lib/db/schema";

// Option lists shared by the application wizard, the admin profiles and the reports.
// Stored values are the keys; the labels are what families see.

export const preferNotToSay = "Prefer not to say";

// Irish mainstream school years, grouped the way parents talk about them. Stored as the
// label, so the flat list is what the reports and the CSVs use.
export const yearGroupSections = [
  { group: "Pre-school", items: ["Not yet in school", "Junior infants", "Senior infants"] },
  {
    group: "Primary",
    items: ["1st class", "2nd class", "3rd class", "4th class", "5th class", "6th class"],
  },
  { group: "Junior cycle", items: ["1st year", "2nd year", "3rd year"] },
  { group: "Senior cycle", items: ["4th year", "5th year", "6th year"] },
];

export const yearGroups = yearGroupSections.flatMap((s) => s.items);

// A home-schooled child usually still works at a year level, so both are said when both
// are known: "3rd class · home schooled".
export function schoolYearLabel(
  yearGroup: string | null | undefined,
  isHomeschooled: boolean,
): string | null {
  if (!isHomeschooled) return yearGroup ?? null;
  return yearGroup ? `${yearGroup} · home schooled` : "Home schooled";
}

export const proficiencyLabels: Record<ArabicProficiency, string> = {
  none: "None yet",
  beginner: "Beginner – knows some letters",
  intermediate: "Can read simple words",
  advanced: "Reads and writes confidently",
  native: "Speaks Arabic at home",
};

export const guardianGenderOptions = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

// "Mother" isn't offered to a father and vice versa; with no gender given, both are.
export function relationshipsFor(gender: GuardianGender | null | undefined): Relationship[] {
  return relationships.filter(
    (r) => !(gender === "female" && r === "father") && !(gender === "male" && r === "mother"),
  );
}

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

// The languages families here actually speak, then the rest of the world's big ones.
// The field accepts anything typed, so this is a head start, not a closed list.
export const commonLanguages = [
  "Arabic",
  "English",
  "Irish",
  "Albanian",
  "Amharic",
  "Bengali",
  "Bosnian",
  "Bulgarian",
  "Cantonese",
  "Croatian",
  "Czech",
  "Danish",
  "Dari",
  "Dutch",
  "Farsi",
  "Filipino",
  "Finnish",
  "French",
  "German",
  "Greek",
  "Gujarati",
  "Hausa",
  "Hindi",
  "Hungarian",
  "Igbo",
  "Indonesian",
  "Italian",
  "Japanese",
  "Korean",
  "Kurdish",
  "Latvian",
  "Lingala",
  "Lithuanian",
  "Malay",
  "Malayalam",
  "Mandarin",
  "Nepali",
  "Norwegian",
  "Oromo",
  "Pashto",
  "Polish",
  "Portuguese",
  "Punjabi",
  "Romanian",
  "Russian",
  "Serbian",
  "Sinhala",
  "Slovak",
  "Somali",
  "Spanish",
  "Swahili",
  "Swedish",
  "Tamil",
  "Telugu",
  "Thai",
  "Tigrinya",
  "Turkish",
  "Twi",
  "Ukrainian",
  "Urdu",
  "Vietnamese",
  "Wolof",
  "Yoruba",
  "Zulu",
];

// The allergies a school hears about most; anything else is typed in. Stored as one text
// field, comma separated, because that is how a teacher reads it on a register.
export const commonAllergies = [
  "Peanuts",
  "Tree nuts",
  "Dairy",
  "Eggs",
  "Wheat or gluten",
  "Soya",
  "Fish",
  "Shellfish",
  "Sesame",
  "Penicillin",
  "Bee or wasp stings",
  "Pollen or hay fever",
  "Dust",
  "Animals",
  "Latex",
];

// Allergies are stored as one comma-separated line (a teacher reads them that way on a
// register) and edited as a list.
export function splitAllergies(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}

// Eircode routing key ("D15 AB12" → "D15"), the only part of the address the reports use.
export function routingKey(postalCode: string): string | null {
  const key = postalCode
    .trim()
    .toUpperCase()
    .match(/^[A-Z]\d{2}|^D6W/)?.[0];
  return key ?? null;
}
