import { Card, SimpleGrid, Stack, Text } from "@mantine/core";
import { notFound } from "next/navigation";
import { CardTitle } from "@/components/CardTitle";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { canViewStudent, loadStudentFacts, requireArea } from "@/lib/access";
import { ageOn } from "@/lib/age";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { getStudentForTeacher } from "@/lib/db/queries/teach";
import { proficiencyLabels, relationshipLabels } from "@/lib/demographics";
import { todayIn } from "@/lib/time";

type Props = { params: Promise<{ id: string }> };

// What a teacher sees of a student: enough to teach and to keep them safe, nothing else.
export default async function TeacherStudentPage({ params }: Props) {
  const id = Number((await params).id);
  const [user, facts] = await Promise.all([requireArea("teach"), loadStudentFacts(id)]);
  if (!facts || !canViewStudent(user, facts)) notFound();
  const [student, { timezone }] = await Promise.all([
    getStudentForTeacher(id),
    getSchoolSettings(),
  ]);
  if (!student) notFound();
  return (
    <Stack gap="lg" maw={860} mx="auto">
      <PageHeader
        eyebrow={[student.className, student.sessionName].filter(Boolean).join(" · ")}
        title={`${student.firstName} ${student.lastName}`}
      />
      <Card>
        <CardTitle>About</CardTitle>
        <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="md">
          <Field label="Age" value={ageOn(student.dateOfBirth, todayIn(timezone))} />
          <Field label="Gender" value={student.gender === "male" ? "Boy" : "Girl"} />
          <Field label="School year" value={student.schoolYearGroup} />
          <Field label="Arabic" value={proficiencyLabels[student.arabicProficiency]} />
        </SimpleGrid>
      </Card>
      <Card>
        <CardTitle>Health</CardTitle>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <Field label="Allergies" value={student.allergies ?? "None"} />
          <Field label="Medical needs" value={student.medicalNotes ?? "None"} />
        </SimpleGrid>
      </Card>
      <Card>
        <CardTitle>Family</CardTitle>
        <Text size="sm" c="dimmed" mb="md">
          Contact details are held by the office. Emergency contacts are here for lessons.
        </Text>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          {student.guardians.map((g, i) => (
            <Field
              key={i}
              label={`${relationshipLabels[g.relationship as keyof typeof relationshipLabels]}${g.isPrimaryContact ? " · first contact" : ""}`}
              value={
                <>
                  {g.name}
                  {g.emergencyContactName && (
                    <Text size="sm" c="dimmed" component="span">
                      {" "}
                      · emergency: {g.emergencyContactName} ({g.emergencyContactRelationship}){" "}
                      {g.emergencyContactPhone}
                    </Text>
                  )}
                </>
              }
            />
          ))}
        </SimpleGrid>
      </Card>
    </Stack>
  );
}
