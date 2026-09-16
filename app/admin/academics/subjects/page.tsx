import { Stack } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { listSubjects } from "@/lib/db/queries/academics";
import { AddSubjectButton, SubjectsTable } from "./SubjectsTable";

export const metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  const subjects = await listSubjects();
  return (
    <Stack gap="lg" maw={720}>
      <PageHeader title="Subjects" actions={<AddSubjectButton />} />
      <SubjectsTable subjects={subjects} />
    </Stack>
  );
}
