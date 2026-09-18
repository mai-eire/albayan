import { Stack } from "@mantine/core";
import { ExportButton } from "@/components/ExportButton";
import { PageHeader } from "@/components/PageHeader";
import {
  getCurrentYear,
  listClasses,
  listSessions,
  listTeachers,
} from "@/lib/db/queries/academics";
import { listGuardiansForAdmin } from "@/lib/db/queries/students";
import { FamiliesList } from "./FamiliesList";
import { InviteGuardianButton } from "./InviteGuardianButton";

export const metadata = { title: "Families" };

// Guardians grouped into families (lib/families.ts); each guardian still has their own page.
export default async function FamiliesPage() {
  const [guardians, year, teachers] = await Promise.all([
    listGuardiansForAdmin(),
    getCurrentYear(),
    listTeachers(),
  ]);
  const [sessions, classes] = year
    ? await Promise.all([listSessions(year.id), listClasses(year.id)])
    : [[], []];
  return (
    <Stack gap="lg" maw={1180}>
      <PageHeader
        title="Families"
        actions={
          <>
            <ExportButton href="/admin/guardians/export" />
            <InviteGuardianButton
              guardians={guardians
                .filter((g) => g.children.length > 0)
                .map((g) => ({
                  id: g.id,
                  name: g.name,
                  children: g.children.map((c) => ({ id: c.id, firstName: c.firstName })),
                }))}
            />
          </>
        }
      />
      <FamiliesList
        guardians={guardians}
        sessions={sessions.map((s) => ({ id: s.id, name: s.name }))}
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
          sessionId: c.sessionId,
          sessionName: c.sessionName,
          teacherIds: c.teacherIds,
        }))}
        teachers={teachers
          .filter((t) => classes.some((c) => c.teacherIds.includes(t.id)))
          .map((t) => ({ id: t.id, name: t.name }))}
      />
    </Stack>
  );
}
