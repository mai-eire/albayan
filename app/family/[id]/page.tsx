import { Card, Text } from "@mantine/core";
import { EntityList } from "@/components/EntityList";
import { MoneyText } from "@/components/MoneyText";
import { StatusBadge } from "@/components/StatusBadge";
import { listAttendanceForStudent } from "@/lib/db/queries/attendance";
import { listPublishedHomeworkForClass } from "@/lib/db/queries/homework";
import { listNotesForGuardian } from "@/lib/db/queries/notes";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { dueLabel, homeworkStatus } from "@/lib/homework";
import { formatDate, nextDateOn, relativeDay, todayIn } from "@/lib/time";
import { loadChild } from "./load";

type Props = { params: Promise<{ id: string }> };

// "What's next" for one child (§5): a short list, each row linking to its tab.
export default async function ChildOverviewPage({ params }: Props) {
  const [child, { timezone }] = await Promise.all([loadChild(params), getSchoolSettings()]);
  const today = todayIn(timezone);
  const [recent, homework, notes] = await Promise.all([
    listAttendanceForStudent(child.id, 1),
    child.place ? listPublishedHomeworkForClass(child.place.classId) : [],
    listNotesForGuardian(child.id),
  ]);
  const due = homework
    .filter((h) => h.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const items = [];
  if (child.place) {
    const next = nextDateOn(child.place.dayOfWeek, today);
    items.push({
      key: "lesson",
      title: `Next class ${relativeDay(next, today, timezone, true)}`,
      detail: `${formatDate(next, timezone)} · ${child.place.startTime}${child.place.room ? ` · ${child.place.room}` : ""} · ${child.place.className}`,
      href: `/family/${child.id}/timetable`,
    });
  } else if (child.status === "applied") {
    items.push({
      key: "application",
      title: "Application received",
      detail: child.preferredSessionName
        ? `You asked for ${child.preferredSessionName}. We'll email you once a place is confirmed.`
        : "We'll email you once a place is confirmed.",
      badge: <StatusBadge domain="application" value="applied" />,
    });
  } else if (child.status === "declined") {
    items.push({
      key: "declined",
      title: "No place this time",
      detail: child.declinedReason ?? "Contact the school office if you have questions.",
      badge: <StatusBadge domain="application" value="declined" />,
    });
  }
  if (due) {
    items.push({
      key: "homework",
      title: due.title,
      detail: `${due.subjectName} · ${dueLabel(due.dueDate, today, timezone)}`,
      badge: <StatusBadge domain="homework" value={homeworkStatus(due.dueDate, today)} />,
      href: `/family/${child.id}/homework`,
    });
  }
  if (recent[0]) {
    items.push({
      key: "attendance",
      title: `Last class: ${formatDate(recent[0].date, timezone)}`,
      detail: recent[0].note ?? "Attendance so far this term is on the attendance tab.",
      badge: <StatusBadge domain="attendance" value={recent[0].status} />,
      href: `/family/${child.id}/attendance`,
    });
  }
  if (notes[0]) {
    items.push({
      key: "note",
      title: `Note from ${notes[0].authorName}`,
      detail: notes[0].body.length > 90 ? `${notes[0].body.slice(0, 90)}…` : notes[0].body,
      href: `/family/${child.id}/notes`,
    });
  }
  if (child.fee) {
    items.push({
      key: "fee",
      title: "Fee for the year",
      detail: child.fee.note ?? "Paying is handled by the school office for now.",
      badge: <MoneyText cents={child.fee.cents} fw={600} />,
    });
  }
  return (
    <Card>
      {items.length ? <EntityList items={items} /> : <Text c="dimmed">Nothing to show yet.</Text>}
    </Card>
  );
}
