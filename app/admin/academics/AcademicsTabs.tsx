"use client";

import { LinkTabs } from "@/components/LinkTabs";

const tabs = [
  { value: "years", label: "Years & terms" },
  { value: "subjects", label: "Subjects" },
  { value: "sessions", label: "Sessions" },
  { value: "classes", label: "Classes" },
];

export function AcademicsTabs() {
  return <LinkTabs base="/admin/academics" tabs={tabs} />;
}
