import { Card, SimpleGrid, Stack, Text } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { DateText } from "@/components/DateText";
import { Field } from "@/components/Field";
import { proficiencyLabels } from "@/lib/demographics";
import { loadChild } from "./load";

type Props = { params: Promise<{ id: string }> };

export default async function ChildDetailsPage({ params }: Props) {
  const child = await loadChild(params);
  return (
    <Stack gap="lg">
      <Card>
        <CardTitle>About {child.firstName}</CardTitle>
        <SimpleGrid cols={{ base: 2, xs: 3 }} spacing="md">
          <Field label="Full name" value={`${child.firstName} ${child.lastName}`} />
          <Field label="Date of birth" value={<DateText date={child.dateOfBirth} withYear />} />
          <Field label="Student ID" value={child.studentId} />
          <Field label="School year" value={child.schoolYearGroup} />
          <Field label="Arabic" value={proficiencyLabels[child.arabicProficiency]} />
          {child.place && <Field label="Class teacher" value={child.place.classTeacherName} />}
        </SimpleGrid>
      </Card>
      <Card>
        <CardTitle>Health</CardTitle>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <Field label="Allergies" value={child.allergies ?? "None"} />
          <Field label="Medical needs" value={child.medicalNotes ?? "None"} />
        </SimpleGrid>
        <Text size="sm" c="dimmed" mt="md">
          To change anything here, contact the school office.
        </Text>
      </Card>
    </Stack>
  );
}
