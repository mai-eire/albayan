import { Stack } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { ExportButton } from "@/components/ExportButton";
import { getCurrentYear, listClasses, listSessions } from "@/lib/db/queries/academics";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { listStudentsForAdmin } from "@/lib/db/queries/students";
import { todayIn } from "@/lib/time";
import { StudentsList } from "./StudentsList";

export const metadata = { title: "Students" };

export default async function StudentsPage() {
  const [rows, year, { timezone }] = await Promise.all([
    listStudentsForAdmin(),
    getCurrentYear(),
    getSchoolSettings(),
  ]);
  const [sessions, classes] = year
    ? await Promise.all([listSessions(year.id), listClasses(year.id)])
    : [[], []];
  return (
    <Stack gap="lg" maw={1180}>
      <PageHeader title="Students" actions={<ExportButton href="/admin/students/export" />} />
      <StudentsList
        rows={rows}
        sessions={sessions.map((s) => ({ id: s.id, name: s.name }))}
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
          sessionId: c.sessionId,
          sessionName: c.sessionName,
        }))}
        today={todayIn(timezone)}
      />
    </Stack>
  );
}
