import { ageOn } from "./age";
import type { ArabicProficiency, Gender, RegistrationReason } from "./db/schema";
import { arabicProficiencies, genders, registrationReasons } from "./db/schema";
import { proficiencyShortLabels, reasonLabels } from "./demographics";

// The office's demographic picture of a year, counts only: nothing here identifies a child,
// and nothing leaves this file per student. PLAN §11 "Reports".

export type Tally = { label: string; count: number };

// One child as the reports see them. Their own facts come from the student row; the
// household ones — address, languages, why they came — live on the guardian who registered
// them, which is the guardian who answered those questions.
export type ReportChild = {
  gender: Gender;
  dateOfBirth: string;
  countryOfOrigin: string | null;
  arabicProficiency: ArabicProficiency;
  sessionName: string;
  languages: string[];
  area: string | null;
  reasons: RegistrationReason[];
};

export type Report = {
  id: string;
  title: string;
  // What the bars are, when it isn't obvious — said once, under the title.
  hint?: string;
  // "words" reads across (long labels), "numbers" reads up (a scale).
  shape: "words" | "numbers";
  data: Tally[];
};

export const notGiven = "Not given";

// Biggest bar first, then alphabetical so equal bars keep a stable order; what nobody
// answered collects into one bar at the end rather than disappearing.
function bySize(values: (string | null | undefined)[]): Tally[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = value?.trim() || notGiven;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const rows = [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return [...rows.filter((r) => r.label !== notGiven), ...rows.filter((r) => r.label === notGiven)];
}

// A scale keeps its own order and shows the gaps: an age nobody is, a level nobody reached
// and a day nobody comes are all worth seeing, so they stay as zeros.
function inOrder<T extends string>(
  values: T[],
  order: readonly T[],
  label: (value: T) => string = (v) => v,
): Tally[] {
  return order.map((value) => ({
    label: label(value),
    count: values.filter((v) => v === value).length,
  }));
}

const genderLabels: Record<Gender, string> = { female: "Girls", male: "Boys" };

export type ReportInput = { children: ReportChild[]; sessions: string[] };

// Every report of the year in the order the page shows them, so the page, the dashboard
// and the CSV all say the same thing in the same words.
export function reports({ children, sessions }: ReportInput, today: string): Report[] {
  const ages = children.map((c) => ageOn(c.dateOfBirth, today));
  const span = ages.length ? range(Math.min(...ages), Math.max(...ages)) : [];
  return [
    {
      id: "age",
      title: "Ages",
      hint: "Age today, one bar per year",
      shape: "numbers",
      data: inOrder(ages.map(String), span.map(String)),
    },
    {
      id: "sessions",
      title: "Sessions",
      shape: "numbers",
      data: inOrder(
        children.map((c) => c.sessionName),
        sessions,
      ),
    },
    {
      id: "gender",
      title: "Boys and girls",
      shape: "numbers",
      data: inOrder(
        children.map((c) => c.gender),
        genders,
        (g) => genderLabels[g],
      ),
    },
    {
      id: "arabic",
      title: "Arabic when they joined",
      hint: "What the family told us at registration",
      shape: "words",
      data: inOrder(
        children.map((c) => c.arabicProficiency),
        arabicProficiencies,
        (p) => proficiencyShortLabels[p],
      ),
    },
    {
      id: "countries",
      title: "Countries of origin",
      shape: "words",
      data: bySize(children.map((c) => c.countryOfOrigin)),
    },
    {
      id: "languages",
      title: "Languages spoken at home",
      hint: "A child counts once for each language",
      shape: "words",
      data: bySize(children.flatMap((c) => (c.languages.length ? c.languages : [null]))),
    },
    {
      id: "areas",
      title: "Where they live",
      hint: "By the routing key of the family's Eircode",
      shape: "words",
      data: bySize(children.map((c) => c.area)),
    },
    {
      id: "reasons",
      title: "Why families chose the school",
      hint: "A child counts once for each reason",
      shape: "words",
      data: bySize(
        children.flatMap((c) =>
          c.reasons.length
            ? c.reasons.filter((r) => registrationReasons.includes(r)).map((r) => reasonLabels[r])
            : [null],
        ),
      ),
    },
  ];
}

// The two the dashboard carries, in this order.
export const headlineReports = ["age", "countries"];

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
