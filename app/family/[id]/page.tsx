import { SimpleGrid, Stack, Text } from "@mantine/core";
import { DateText } from "@/components/DateText";
import { EditableCard } from "@/components/EditableCard";
import { Field } from "@/components/Field";
import { proficiencyLabels, schoolYearLabel } from "@/lib/demographics";
import { ChildDetailsForm, ChildHealthForm } from "./forms";
import { loadChild } from "./load";

type Props = { params: Promise<{ id: string }> };

// The family's own copy of their child's record. They keep the facts they know best right
// — the name, the year, the allergies; the school ID, the Arabic level and the class are
// the school's to set.
export default async function ChildDetailsPage({ params }: Props) {
  const child = await loadChild(params);
  return (
    <Stack gap="lg">
      <EditableCard
        title={`About ${child.firstName}`}
        view={
          <SimpleGrid cols={{ base: 2, xs: 3 }} spacing="md">
            <Field label="Full name" value={`${child.firstName} ${child.lastName}`} />
            <Field label="Date of birth" value={<DateText date={child.dateOfBirth} withYear />} />
            <Field label="Student ID" value={child.studentId} />
            <Field
              label="School year"
              value={schoolYearLabel(child.schoolYearGroup, child.isHomeschooled)}
            />
            <Field label="Arabic" value={proficiencyLabels[child.arabicProficiency]} />
            {child.place && <Field label="Class teacher" value={child.place.classTeacherName} />}
          </SimpleGrid>
        }
      >
        <ChildDetailsForm child={child} />
      </EditableCard>
      <EditableCard
        title="Health"
        view={
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
            <Field label="Allergies" value={child.allergies ?? "None"} />
            <Field label="Medical needs" value={child.medicalNotes ?? "None"} />
          </SimpleGrid>
        }
      >
        <ChildHealthForm child={child} />
      </EditableCard>
      <Text size="sm" c="dimmed">
        The student ID, the Arabic level and the class are set by the school — ring the office if
        one of those is wrong.
      </Text>
    </Stack>
  );
}
