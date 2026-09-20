import { clock } from "@/lib/clock";
import { notFound } from "next/navigation";
import { currentPeriod, getCurrentYear } from "@/lib/db/queries/academics";
import { listRegistersForTerm } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { getStaffMember } from "@/lib/db/queries/staff";
import { todayIn } from "@/lib/time";

// Each tab loads the same person and the term's registers for their classes.
export async function loadStaffMember(params: Promise<{ id: string }>) {
  const [{ id }, year, settings] = await Promise.all([
    params,
    getCurrentYear(),
    getSchoolSettings(),
  ]);
  const person = await getStaffMember(Number(id), year?.id ?? null);
  if (!person) notFound();
  const today = todayIn(settings.timezone, await clock());
  const period = year ? await currentPeriod(today) : null;
  const rows =
    year && period && person.classes.length
      ? await listRegistersForTerm(year.id, period.from, period.to < today ? period.to : today)
      : [];
  const classIds = new Set(person.classes.map((c) => c.id));
  const registers = rows.filter((r) => classIds.has(r.classId) && r.studentCount > 0);
  return {
    person,
    year,
    period,
    timezone: settings.timezone,
    // Registers due so far this term for the classes they take, and how many are in.
    registers: {
      due: registers.length,
      taken: registers.filter((r) => r.recordedCount >= r.studentCount).length,
      byClass: (classId: number) => {
        const mine = registers.filter((r) => r.classId === classId);
        return {
          due: mine.length,
          taken: mine.filter((r) => r.recordedCount >= r.studentCount).length,
        };
      },
    },
  };
}
