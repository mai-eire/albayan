import { ApplicationCard } from "@/components/ApplicationCard";
import { getCurrentYear, listClasses, listSessions } from "@/lib/db/queries/academics";
import { sessionEndTime } from "@/lib/timetable";
import type { DayChoice } from "@/app/family/register-child/ApplicationWizard";
import { loadChild } from "../load";
import { EditApplication } from "./EditApplication";

type Props = { params: Promise<{ id: string }> };

// What the family asked for and where it got to. While it waits, they can correct it.
export default async function ChildApplicationPage({ params }: Props) {
  const child = await loadChild(params);
  const waiting = child.status === "applied";
  const year = waiting ? await getCurrentYear() : null;
  const [sessions, classes] = year
    ? await Promise.all([listSessions(year.id), listClasses(year.id)])
    : [[], []];
  const days: DayChoice[] = sessions
    .filter((s) => s.isActive)
    .map((s) => ({
      id: s.id,
      label: `${s.name} ${s.startTime}–${sessionEndTime(s.startTime, s.periods)}`,
      classes: classes.filter((c) => c.sessionId === s.id).map((c) => ({ id: c.id, name: c.name })),
    }));
  return (
    <ApplicationCard
      application={{
        status:
          child.status === "applied"
            ? "applied"
            : child.status === "declined"
              ? "declined"
              : "accepted",
        appliedAt: child.appliedAt,
        decidedAt: child.decidedAt,
        academicYearId: child.academicYearId,
        schoolYearGroup: child.schoolYearGroup,
        arabicProficiency: child.arabicProficiency,
        preferredSessionName: child.preferredSessionName,
        preferredClassName: child.preferredClassName,
        placedClassName: child.place?.className ?? null,
        placedSessionName: child.place?.sessionName ?? null,
        offerNote: child.offerNote,
        applicationNotes: child.applicationNotes,
        declinedReason: child.declinedReason,
      }}
      action={
        waiting && (
          <EditApplication
            id={child.id}
            days={days}
            child={{
              firstName: child.firstName,
              lastName: child.lastName,
              dateOfBirth: child.dateOfBirth,
              gender: child.gender,
              schoolYearGroup: child.schoolYearGroup ?? "",
              arabicProficiency: child.arabicProficiency,
              allergies: child.allergies ?? "",
              medicalNotes: child.medicalNotes ?? "",
              applicationNotes: child.applicationNotes ?? "",
              preferredSessionId: child.preferredSessionId,
              preferredClassId: child.preferredClassId,
            }}
          />
        )
      }
    />
  );
}
