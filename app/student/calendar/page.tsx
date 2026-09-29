import { CalendarPage } from "@/components/CalendarPage";
import { requireArea } from "@/lib/access";
import { lessonDaysForStudents, scopeForStudents } from "@/lib/db/queries/calendar";

export const metadata = { title: "Calendar" };

type Props = { searchParams: Promise<{ month?: string; view?: string; classDays?: string }> };

export default async function StudentCalendarPage({ searchParams }: Props) {
  const [user, { month, view, classDays }] = await Promise.all([
    requireArea("student"),
    searchParams,
  ]);
  const me = user.student ? [{ id: user.student.id, firstName: user.student.firstName }] : [];
  const [lessonDays, scope] = await Promise.all([
    lessonDaysForStudents(me),
    scopeForStudents(me.map((s) => s.id)),
  ]);
  return (
    <CalendarPage
      base="/student/calendar"
      month={month}
      view={view}
      classDays={classDays}
      lessonDays={lessonDays}
      scope={scope}
    />
  );
}
