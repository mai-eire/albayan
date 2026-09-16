import { CalendarPage } from "@/components/CalendarPage";
import { requireArea } from "@/lib/access";
import { getCurrentYear } from "@/lib/db/queries/academics";
import { lessonDaysForTeacher } from "@/lib/db/queries/calendar";

export const metadata = { title: "Calendar" };

type Props = { searchParams: Promise<{ month?: string }> };

export default async function TeacherCalendarPage({ searchParams }: Props) {
  const [user, year, { month }] = await Promise.all([
    requireArea("teach"),
    getCurrentYear(),
    searchParams,
  ]);
  const lessonDays =
    user.teacher && year ? await lessonDaysForTeacher(user.teacher.id, year.id) : [];
  return <CalendarPage base="/teach/calendar" month={month} lessonDays={lessonDays} />;
}
