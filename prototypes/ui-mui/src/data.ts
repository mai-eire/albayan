// Mock data for the teacher "Today" prototype. Identical in all three prototypes.

export const teacher = { name: "Maryam Hussain", initials: "MH", roles: ["Teacher", "Parent"] };

export const today = new Date(2026, 8, 19); // Saturday 19 September 2026

export const gregorian = new Intl.DateTimeFormat("en-IE", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
}).format(today);

export const hijri = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
  day: "numeric", month: "long", year: "numeric",
}).format(today);

export type Subject = "Quran" | "Arabic" | "Islamic Studies" | "Break";

export const subjectColor: Record<Subject, string> = {
  Quran: "lapis", Arabic: "tile", "Islamic Studies": "plum", Break: "muted",
};

export const lessons = [
  { start: "10:00", end: "10:50", subject: "Quran" as Subject, className: "Level 2", room: "Room 3", registerDue: true },
  { start: "10:50", end: "11:40", subject: "Arabic" as Subject, className: "Level 2", room: "Room 3", registerDue: false },
  { start: "11:40", end: "11:55", subject: "Break" as Subject, className: "", room: "", registerDue: false },
  { start: "11:55", end: "12:45", subject: "Quran" as Subject, className: "Level 4", room: "Room 1", registerDue: true },
];

export const nowIndex = 1; // the lesson currently in progress

export const stats = [
  { label: "Lessons today", value: 3, hint: "Saturday session · 10:00–12:45" },
  { label: "Registers to take", value: 2, hint: "Level 2, Level 4" },
  { label: "Homework due today", value: 4, hint: "3 Quran · 1 Arabic" },
];

export type Status = "present" | "late" | "absent";

export const students: { id: number; name: string; age: number; allergy?: string; status: Status }[] = [
  { id: 1, name: "Aisha Rahman", age: 8, status: "present" },
  { id: 2, name: "Bilal Khan", age: 8, allergy: "Peanuts", status: "present" },
  { id: 3, name: "Fatima Zahra Ali", age: 9, status: "late" },
  { id: 4, name: "Hamza Osman", age: 8, status: "present" },
  { id: 5, name: "Layla Benali", age: 8, status: "absent" },
  { id: 6, name: "Musa Adeyemi", age: 9, allergy: "Asthma inhaler", status: "present" },
  { id: 7, name: "Nour El-Sayed", age: 8, status: "present" },
  { id: 8, name: "Yusuf Ibrahim", age: 9, status: "present" },
];

export const homeworkDue = [
  { subject: "Quran" as Subject, className: "Level 2", title: "Memorise Surah Al-Fil, verses 1–5" },
  { subject: "Quran" as Subject, className: "Level 4", title: "Tajweed: noon sakinah rules worksheet" },
  { subject: "Arabic" as Subject, className: "Level 2", title: "Write 10 words with the letter ب" },
  { subject: "Quran" as Subject, className: "Level 2", title: "Listen to Surah Al-Fil recitation" },
];

export const classOptions = ["Level 2 · Saturday", "Level 4 · Saturday"];
export const subjectOptions = ["Quran", "Arabic", "Islamic Studies"];
