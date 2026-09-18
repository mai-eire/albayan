import { Group, Stack } from "@mantine/core";
import { ExportButton } from "@/components/ExportButton";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/current-user";
import {
  getCurrentYear,
  listClasses,
  listSessions,
  listSubjects,
} from "@/lib/db/queries/academics";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { listStaff } from "@/lib/db/queries/staff";
import { InviteButton } from "./InviteForm";
import { StaffTable } from "./StaffTable";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const [year, me, { timezone }, subjects] = await Promise.all([
    getCurrentYear(),
    getCurrentUser(),
    getSchoolSettings(),
    listSubjects(),
  ]);
  const [staff, sessions, classes] = await Promise.all([
    listStaff(year?.id ?? null),
    year ? listSessions(year.id) : [],
    year ? listClasses(year.id) : [],
  ]);
  return (
    <Stack gap="lg" maw={1180}>
      <PageHeader
        title="Staff"
        actions={
          <Group gap="sm">
            <ExportButton href="/admin/staff/export" />
            <InviteButton />
          </Group>
        }
      />
      <StaffTable
        staff={staff}
        sessions={sessions.map((s) => ({ id: s.id, name: s.name }))}
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
          sessionId: c.sessionId,
          sessionName: c.sessionName,
        }))}
        subjects={subjects.filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.name }))}
        currentUserId={me?.id ?? 0}
        timezone={timezone}
      />
    </Stack>
  );
}
