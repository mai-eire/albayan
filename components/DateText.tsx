import { Text, type TextProps } from "@mantine/core";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate } from "@/lib/time";

// "Saturday 19 September" in the school timezone. Server-only: it reads the settings.
export async function DateText({
  date,
  withYear,
  ...props
}: { date: string | Date; withYear?: boolean } & TextProps) {
  const { timezone } = await getSchoolSettings();
  return (
    <Text component="span" {...props}>
      {formatDate(date, timezone, withYear)}
    </Text>
  );
}
