import {
  classChoice,
  currentPeriod,
  listClasses,
  listRosterForAdmin,
} from "@/lib/db/queries/academics";
import { clock } from "@/lib/clock";
import { countRegistersTaken, summariseAttendance } from "@/lib/db/queries/attendance";
import { familyOverviewFor } from "@/lib/db/queries/families";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { todayIn } from "@/lib/time";
import { RosterCard } from "../RosterCard";
import { loadClass } from "../load";

type Props = { params: Promise<{ id: string }> };

export default async function ClassStudentsPage({ params }: Props) {
  const cls = await loadClass(params);
  const [roster, allClasses, { timezone }] = await Promise.all([
    listRosterForAdmin(cls.id),
    listClasses(cls.academicYearId),
    getSchoolSettings(),
  ]);
  const today = todayIn(timezone, await clock());
  const period = await currentPeriod(today);
  const to = period ? (period.to < today ? period.to : today) : today;
  const [attendance, registersTaken, families] = await Promise.all([
    period ? summariseAttendance(cls.id, period.from, to) : [],
    period ? countRegistersTaken(cls.id, period.from, to) : 0,
    familyOverviewFor(
      roster.map((s) => s.studentId),
      cls.academicYearId,
    ),
  ]);
  const current = allClasses.find((c) => c.id === cls.id);
  return (
    <RosterCard
      roster={roster}
      attendance={attendance}
      registersTaken={registersTaken}
      periodLabel={period?.label ?? null}
      current={
        current
          ? classChoice(current)
          : {
              id: cls.id,
              name: cls.name,
              sessionId: cls.sessionId,
              sessionName: cls.session.name,
              classTeacherName: null,
              studentCount: cls.studentCount,
              capacity: cls.capacity,
              applicationCount: 0,
            }
      }
      otherClasses={allClasses.filter((c) => c.id !== cls.id).map(classChoice)}
      capacity={cls.capacity}
      families={Object.fromEntries(families)}
      today={today}
    />
  );
}
