import { CalendarPage } from "@/components/CalendarPage";
import { requireArea } from "@/lib/access";
import { lessonDaysForStudents } from "@/lib/db/queries/calendar";
import { listChildrenForGuardian } from "@/lib/db/queries/students";

export const metadata = { title: "Calendar" };

type Props = { searchParams: Promise<{ month?: string }> };

export default async function FamilyCalendarPage({ searchParams }: Props) {
  const [user, { month }] = await Promise.all([requireArea("family"), searchParams]);
  const kids = user.guardian ? await listChildrenForGuardian(user.guardian.id) : [];
  const lessonDays = await lessonDaysForStudents(kids.filter((k) => k.status === "active"));
  return <CalendarPage base="/family/calendar" month={month} lessonDays={lessonDays} />;
}
