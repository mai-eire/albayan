"use client";

import { usePathname, useRouter } from "next/navigation";
import { DateField } from "@/components/DateField";

// Which day the page shows; kept in the URL so it survives a refresh.
export function DatePicker({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <DateField
      aria-label="Date"
      value={value}
      onChange={(date) => date && router.push(`${pathname}?date=${date}`)}
      maxDate={new Date()}
      maw={220}
    />
  );
}
