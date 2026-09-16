import { Card, Stack } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { DetailsForm, HealthForm } from "./forms";
import { loadStudent } from "./load";

type Props = { params: Promise<{ id: string }> };

export default async function StudentDetailsPage({ params }: Props) {
  const student = await loadStudent(params);
  return (
    <Stack gap="lg">
      <Card>
        <CardTitle>Details</CardTitle>
        <DetailsForm student={student} />
      </Card>
      <Card>
        <CardTitle>Health</CardTitle>
        <HealthForm student={student} />
      </Card>
    </Stack>
  );
}
