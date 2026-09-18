import { Card, SimpleGrid, Stack, Text } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { DateText } from "@/components/DateText";
import { EditableCard } from "@/components/EditableCard";
import { Field } from "@/components/Field";
import { proficiencyLabels } from "@/lib/demographics";
import { DetailsForm, HealthForm } from "./forms";
import { loadStudent } from "./load";

type Props = { params: Promise<{ id: string }> };

export default async function StudentDetailsPage({ params }: Props) {
  const student = await loadStudent(params);
  return (
    <Stack gap="lg">
      <EditableCard
        title="Details"
        view={
          <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="md">
            <Field label="First name" value={student.firstName} />
            <Field label="Surname" value={student.lastName} />
            <Field label="Date of birth" value={<DateText date={student.dateOfBirth} withYear />} />
            <Field label="Gender" value={student.gender === "female" ? "Girl" : "Boy"} />
            <Field label="School year" value={student.schoolYearGroup} />
            <Field label="Arabic level" value={proficiencyLabels[student.arabicProficiency]} />
            <Field label="Student's email" value={student.email} />
            <Field label="Student's phone" value={student.phone} />
          </SimpleGrid>
        }
      >
        <DetailsForm student={student} />
      </EditableCard>
      <EditableCard
        title="Health"
        view={
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
            <Field label="Allergies" value={student.allergies ?? "None recorded"} />
            <Field label="Medical needs" value={student.medicalNotes ?? "None recorded"} />
          </SimpleGrid>
        }
      >
        <HealthForm student={student} />
      </EditableCard>
      <Card>
        <CardTitle>Application</CardTitle>
        <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="md">
          <Field label="Applied" value={<DateText date={student.appliedAt} withYear />} />
          <Field
            label="Preferred session"
            value={student.preferredSessionName ?? "No preference"}
          />
          <Field label="Preferred class" value={student.preferredClassName ?? "No preference"} />
          <Field
            label="Decided"
            value={student.approvedAt ? <DateText date={student.approvedAt} withYear /> : "Not yet"}
          />
        </SimpleGrid>
        {student.applicationNotes && (
          <Text size="sm" mt="md">
            From the family: {student.applicationNotes}
          </Text>
        )}
        {student.declinedReason && (
          <Text size="sm" mt="md">
            Declined: {student.declinedReason}
          </Text>
        )}
      </Card>
    </Stack>
  );
}
