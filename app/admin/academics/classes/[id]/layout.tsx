import { Alert, Stack } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { AppLink } from "@/components/AppLink";
import { baseTab, LinkTabs } from "@/components/LinkTabs";
import { Nothing } from "@/components/Nothing";
import { PageHeader } from "@/components/PageHeader";
import { clock } from "@/lib/clock";
import { listApplicationsForClass } from "@/lib/db/queries/applications";
import { registersStanding } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { todayIn } from "@/lib/time";
import { DeleteClassButton } from "./DeleteClassButton";
import { loadClass } from "./load";

export default async function ClassLayout({
  params,
  children,
}: LayoutProps<"/admin/academics/classes/[id]">) {
  const cls = await loadClass(params);
  const { timezone } = await getSchoolSettings();
  const [applications, registers] = await Promise.all([
    listApplicationsForClass(cls.id),
    registersStanding(cls.academicYearId, cls.id, todayIn(timezone, await clock())),
  ]);
  const tabs = [
    { value: baseTab, label: "Details" },
    { value: "teachers", label: "Teachers" },
    {
      value: "students",
      label: "Students",
      count: cls.capacity === null ? cls.studentCount : `${cls.studentCount} / ${cls.capacity}`,
    },
    {
      value: "attendance",
      label: "Attendance",
      mark: registers.missing
        ? {
            kind: "warning" as const,
            label: `${registers.missing} of ${registers.total} registers still to come`,
          }
        : null,
    },
    { value: "applications", label: "Applications", count: applications.length },
  ];
  return (
    <Stack gap="lg" maw={960}>
      <PageHeader
        breadcrumbs={[
          { label: "Classes", href: `/admin/academics/classes?year=${cls.academicYearId}` },
        ]}
        eyebrow={`${cls.academicYearId} · ${cls.session.name}`}
        title={cls.name}
        aside={
          <>
            Class teacher{" "}
            {cls.classTeacher ? (
              <AppLink href={`/admin/staff/${cls.classTeacher.userId}`} size="sm" fw={500}>
                {cls.classTeacher.name}
              </AppLink>
            ) : (
              <Nothing>none yet</Nothing>
            )}
          </>
        }
        actions={<DeleteClassButton id={cls.id} name={cls.name} studentCount={cls.studentCount} />}
      />
      {cls.capacity !== null && cls.studentCount > cls.capacity && (
        <Alert color="saffron" variant="light" icon={<IconAlertTriangle size={16} stroke={1.75} />}>
          Over capacity: {cls.studentCount} students for {cls.capacity} places.
        </Alert>
      )}
      <LinkTabs base={`/admin/academics/classes/${cls.id}`} tabs={tabs} />
      {children}
    </Stack>
  );
}
