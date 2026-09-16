"use client";

import { DateInput, type DateInputProps } from "@mantine/dates";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const typedFormats = [
  "D MMM YYYY",
  "D MMMM YYYY",
  "ddd D MMM YYYY",
  "D/M/YYYY",
  "D-M-YYYY",
  "YYYY-MM-DD",
];

// Shows "Sat 19 Sep 2026" (§4.7) and accepts whatever people type: "19 Sep 2026",
// "19/9/2026", "2026-09-19". Value is a YYYY-MM-DD string.
function parseTyped(input: string): string | null {
  // A leading weekday ("Sat 19 Sep 2026", as the field itself displays) is ignored.
  const text = input.trim().replace(/^[A-Za-z]{3,9}\s+(?=\d)/, "");
  for (const format of typedFormats) {
    const parsed = dayjs(text, format, true);
    if (parsed.isValid()) return parsed.format("YYYY-MM-DD");
  }
  return null;
}

export function DateField(props: DateInputProps) {
  return <DateInput valueFormat="ddd D MMM YYYY" dateParser={parseTyped} {...props} />;
}
