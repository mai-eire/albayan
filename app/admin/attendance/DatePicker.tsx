"use client";

import { useRouter } from "next/navigation";
import { DateField } from "@/components/DateField";

// Picking a day opens that day's registers, whichever view is showing.
export function DatePicker({ value }: { value: string }) {
  const router = useRouter();
  return (
    <DateField
      aria-label="Date"
      value={value}
      onChange={(date) => date && router.push(`/admin/attendance?view=day&date=${date}`)}
      maxDate={new Date()}
      maw={220}
    />
  );
}
