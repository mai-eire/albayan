import { Card, Stack, Text } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { ClassTimetable } from "@/components/ClassTimetable";
import { PageHeader } from "@/components/PageHeader";
import { requireArea } from "@/lib/access";
import { getStudentForStudent } from "@/lib/db/queries/family";

export const metadata = { title: "Timetable" };

export default async function StudentTimetablePage() {
  const user = await requireArea("student");
  const me = user.student ? await getStudentForStudent(user.student.id) : null;
  return (
    <Stack gap="lg" maw={720} mx="auto">
      <PageHeader title="Timetable" eyebrow={me?.place?.className} />
      {me?.place ? (
        <Card>
          <CardTitle>
            Every {me.place.sessionName}
            {me.place.room && (
              <Text component="span" c="dimmed" fw={400}>
                {" "}
                · {me.place.room}
              </Text>
            )}
          </CardTitle>
          <ClassTimetable
            startTime={me.place.startTime}
            periods={me.place.periods.map((p) => ({ ...p, detail: p.teacherName }))}
          />
        </Card>
      ) : (
        <Card>
          <Text c="dimmed">You don&apos;t have a class yet.</Text>
        </Card>
      )}
    </Stack>
  );
}
