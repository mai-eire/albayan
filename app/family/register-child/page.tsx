import { Stack } from "@mantine/core";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { sessionEndTime } from "@/lib/timetable";
import { requireArea } from "@/lib/access";
import { getCurrentYear, listClasses, listSessions } from "@/lib/db/queries/academics";
import { getGuardianSelf, lastRelationshipFor } from "@/lib/db/queries/students";
import { ApplicationWizard, type DayChoice } from "./ApplicationWizard";

export const metadata = { title: "Register a child" };

export default async function RegisterChildPage() {
  const user = await requireArea("family");
  if (!user.emailVerified || !user.guardian) redirect("/family");
  const [guardian, lastRelationship, year] = await Promise.all([
    getGuardianSelf(user.guardian.id),
    lastRelationshipFor(user.guardian.id),
    getCurrentYear(),
  ]);
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
    <Stack gap="lg" maw={720} mx="auto">
      <PageHeader title="Register a child" />
      <ApplicationWizard
        guardian={guardian ?? null}
        lastRelationship={lastRelationship}
        days={days}
      />
    </Stack>
  );
}
