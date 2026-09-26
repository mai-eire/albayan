import { Card, SimpleGrid, Stack, Text } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { DateText } from "@/components/DateText";
import { EmptyState } from "@/components/EmptyState";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { IconUser } from "@tabler/icons-react";
import { requireArea } from "@/lib/access";
import { getStudentForStudent } from "@/lib/db/queries/family";
import { proficiencyLabels, relationshipLabels, schoolYearLabel } from "@/lib/demographics";
import type { Relationship } from "@/lib/db/schema";

export const metadata = { title: "My details" };

// What the school has written down about them. Read-only: a child does not correct their
// own record, but they should be able to check it and say if it is wrong.
export default async function StudentDetailsPage() {
  const user = await requireArea("student");
  const me = user.student ? await getStudentForStudent(user.student.id) : null;
  if (!me) {
    return (
      <Stack gap="lg" maw={720} mx="auto">
        <PageHeader title="My details" />
        <EmptyState
          icon={<IconUser size={20} stroke={1.75} />}
          message="The school hasn't set your record up yet."
        />
      </Stack>
    );
  }
  return (
    <Stack gap="lg" maw={720} mx="auto">
      <PageHeader title="My details" />
      <Card>
        <CardTitle>About me</CardTitle>
        <SimpleGrid cols={{ base: 2, xs: 3 }} spacing="md">
          <Field label="Name" value={`${me.firstName} ${me.lastName}`} />
          <Field label="Date of birth" value={<DateText date={me.dateOfBirth} withYear />} />
          <Field label="Student ID" value={me.studentId} />
          <Field
            label="School year"
            value={schoolYearLabel(me.schoolYearGroup, me.isHomeschooled)}
          />
          <Field label="Arabic" value={proficiencyLabels[me.arabicProficiency]} />
          {me.place && <Field label="Class" value={me.place.className} />}
        </SimpleGrid>
      </Card>
      <Card>
        <CardTitle>Health</CardTitle>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <Field label="Allergies" value={me.allergies ?? "None"} />
          <Field label="Medical needs" value={me.medicalNotes ?? "None"} />
        </SimpleGrid>
      </Card>
      {me.guardians.length > 0 && (
        <Card>
          <CardTitle>Who looks after you</CardTitle>
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
            {me.guardians.map((g) => (
              <Field
                key={g.name}
                label={relationshipLabels[g.relationship as Relationship]}
                value={g.name}
              />
            ))}
          </SimpleGrid>
        </Card>
      )}
      <Text size="sm" c="dimmed">
        Something wrong here? Your parent or guardian can change most of it from their own account.
        For your name, student ID or class, ask the school office.
      </Text>
    </Stack>
  );
}
