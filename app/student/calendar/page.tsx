import { CalendarPage } from "@/components/CalendarPage";
import { requireArea } from "@/lib/access";
import { lessonDaysForStudents } from "@/lib/db/queries/calendar";

export const metadata = { title: "Calendar" };

type Props = { searchParams: Promise<{ month?: string }> };

export default async function StudentCalendarPage({ searchParams }: Props) {
  const [user, { month }] = await Promise.all([requireArea("student"), searchParams]);
  const lessonDays = user.student
    ? await lessonDaysForStudents([{ id: user.student.id, firstName: user.student.firstName }])
    : [];
  return <CalendarPage base="/student/calendar" month={month} lessonDays={lessonDays} />;
}
