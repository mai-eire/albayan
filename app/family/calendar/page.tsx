import { CalendarPage } from "@/components/CalendarPage";
import { requireArea } from "@/lib/access";
import { lessonDaysForStudents, scopeForStudents } from "@/lib/db/queries/calendar";
import { listChildrenForGuardian } from "@/lib/db/queries/students";

export const metadata = { title: "Calendar" };

type Props = { searchParams: Promise<{ month?: string; view?: string }> };

export default async function FamilyCalendarPage({ searchParams }: Props) {
  const [user, { month, view }] = await Promise.all([requireArea("family"), searchParams]);
  const kids = user.guardian ? await listChildrenForGuardian(user.guardian.id) : [];
  const active = kids.filter((k) => k.status === "active");
  const [lessonDays, scope] = await Promise.all([
    lessonDaysForStudents(active),
    scopeForStudents(active.map((k) => k.id)),
  ]);
  return (
    <CalendarPage
      base="/family/calendar"
      month={month}
      view={view}
      lessonDays={lessonDays}
      scope={scope}
    />
  );
}
