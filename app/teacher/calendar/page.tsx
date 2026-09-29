import { CalendarPage } from "@/components/CalendarPage";
import { requireArea } from "@/lib/access";
import { lessonDaysForTeacher, scopeForTeacher } from "@/lib/db/queries/calendar";
import { getCurrentYear } from "@/lib/db/queries/academics";

export const metadata = { title: "Calendar" };

type Props = { searchParams: Promise<{ month?: string; view?: string; classDays?: string }> };

// The same calendar everyone else gets, scoped to the classes this teacher takes — and,
// unlike a family's, it carries the staff meetings.
export default async function TeacherCalendarPage({ searchParams }: Props) {
  const [user, year, { month, view, classDays }] = await Promise.all([
    requireArea("teacher"),
    getCurrentYear(),
    searchParams,
  ]);
  const [lessonDays, scope] =
    user.teacher && year
      ? await Promise.all([
          lessonDaysForTeacher(user.teacher.id, year.id),
          scopeForTeacher(user.teacher.id, year.id),
        ])
      : [[], { sessionIds: [], classIds: [], staff: true }];
  return (
    <CalendarPage
      base="/teacher/calendar"
      month={month}
      view={view}
      classDays={classDays}
      lessonDays={lessonDays}
      scope={scope}
    />
  );
}
