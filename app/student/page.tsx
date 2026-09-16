import { Card, Stack, Text } from "@mantine/core";
import { IconBook } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { EntityList } from "@/components/EntityList";
import { PageHeader } from "@/components/PageHeader";
import { requireArea } from "@/lib/access";
import { getStudentForStudent } from "@/lib/db/queries/family";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate, formatHijri, nextDateOn, relativeDay, todayIn } from "@/lib/time";

export const metadata = { title: "Home" };

export default async function StudentHome() {
  const [user, { timezone }] = await Promise.all([requireArea("student"), getSchoolSettings()]);
  const me = user.student ? await getStudentForStudent(user.student.id) : null;
  const now = new Date();
  const today = todayIn(timezone);
  const next = me?.place ? nextDateOn(me.place.dayOfWeek, today) : null;
  return (
    <Stack gap="lg" maw={720} mx="auto">
      <PageHeader
        eyebrow={`${formatDate(now, timezone)} · ${formatHijri(now, timezone)}`}
        title={`Hi, ${me?.firstName ?? user.name.split(" ")[0]}`}
      />
      {me?.place && next ? (
        <Card>
          <EntityList
            items={[
              {
                key: "lesson",
                title: `Next class ${relativeDay(next, today, timezone, true)}`,
                detail: `${formatDate(next, timezone)} · ${me.place.startTime}${me.place.room ? ` · ${me.place.room}` : ""} · ${me.place.className}`,
                href: "/student/timetable",
              },
            ]}
          />
          <Text size="sm" c="dimmed" mt="md">
            Homework and resources will show up here once your teachers add them.
          </Text>
        </Card>
      ) : (
        <EmptyState
          icon={<IconBook size={20} stroke={1.75} />}
          message="You don't have a class yet. Ask the school office."
        />
      )}
    </Stack>
  );
}
