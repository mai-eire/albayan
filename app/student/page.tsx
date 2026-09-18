import { Card, Stack } from "@mantine/core";
import { IconBook } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { EntityList } from "@/components/EntityList";
import { PageHeader } from "@/components/PageHeader";
import { requireArea } from "@/lib/access";
import { getStudentForStudent } from "@/lib/db/queries/family";
import { listAttendanceForStudent } from "@/lib/db/queries/attendance";
import { listPublishedHomeworkForClass } from "@/lib/db/queries/homework";
import { listNotesForStudent } from "@/lib/db/queries/notes";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { dueLabel, homeworkStatus } from "@/lib/homework";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatHijri, nextDateOn, relativeDay, todayIn } from "@/lib/time";

export const metadata = { title: "Home" };

export default async function StudentHome() {
  const [user, { timezone, rules }] = await Promise.all([
    requireArea("student"),
    getSchoolSettings(),
  ]);
  const me = user.student ? await getStudentForStudent(user.student.id) : null;
  const now = new Date();
  const today = todayIn(timezone);
  const next = me?.place ? nextDateOn(me.place.dayOfWeek, today) : null;
  const [homework, recent, notes] = me
    ? await Promise.all([
        me.place ? listPublishedHomeworkForClass(me.place.classId) : [],
        listAttendanceForStudent(me.id, 1),
        listNotesForStudent(me.id),
      ])
    : [[], [], []];
  const due = homework
    .filter((h) => h.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);
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
              ...due.map((h) => ({
                key: `hw-${h.id}`,
                title: h.title,
                detail: `${h.subjectName} · ${dueLabel(h.dueDate, today, timezone)}`,
                badge: <StatusBadge domain="homework" value={homeworkStatus(h.dueDate, today)} />,
                href: "/student/homework",
              })),
              ...(recent[0]
                ? [
                    {
                      key: "attendance",
                      title: `Last class: ${formatDate(recent[0].date, timezone)}`,
                      detail: "How you've been doing at coming in",
                      badge: <StatusBadge domain="attendance" value={recent[0].status} />,
                    },
                  ]
                : []),
              ...(notes[0]
                ? [
                    {
                      key: "note",
                      title: `From ${notes[0].authorName}`,
                      detail:
                        notes[0].body.length > 90
                          ? `${notes[0].body.slice(0, 90)}…`
                          : notes[0].body,
                    },
                  ]
                : []),
              ...(rules
                ? [
                    {
                      key: "rules",
                      title: "School rules",
                      detail: "What the school asks of everyone",
                      href: "/student/rules",
                    },
                  ]
                : []),
            ]}
          />
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
