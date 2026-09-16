import { Stack } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { listYears } from "@/lib/db/queries/academics";
import { AddYearButton } from "./YearForm";
import { YearsTable } from "./YearsTable";

export const metadata = { title: "Years & terms" };

export default async function YearsPage() {
  const years = await listYears();
  return (
    <Stack gap="lg">
      <PageHeader title="Academic years" actions={<AddYearButton />} />
      <YearsTable years={years} />
    </Stack>
  );
}
