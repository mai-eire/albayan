import { Stack, Text } from "@mantine/core";
import { baseTab, LinkTabs } from "@/components/LinkTabs";
import { Nothing } from "@/components/Nothing";
import { PageHeader } from "@/components/PageHeader";
import { clock } from "@/lib/clock";
import { registersStanding } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { todayIn } from "@/lib/time";
import { loadTeacherClass } from "./load";

export default async function TeacherClassLayout({
  params,
  children,
}: LayoutProps<"/teacher/classes/[id]">) {
  const [{ user, cls }, { timezone }] = await Promise.all([
    loadTeacherClass(params),
    getSchoolSettings(),
  ]);
  const registers = await registersStanding(
    cls.academicYearId,
    cls.id,
    todayIn(timezone, await clock()),
  );
  const mine = cls.classTeacherId !== null && cls.classTeacherId === user.teacher?.id;
  const tabs = [
    {
      value: baseTab,
      label: "Students",
      count: cls.capacity === null ? cls.roster.length : `${cls.roster.length} / ${cls.capacity}`,
    },
    {
      value: "attendance",
      label: "Attendance",
      mark: registers.missing
        ? {
            kind: "warning" as const,
            label: `${registers.missing} of ${registers.total} registers not taken`,
          }
        : null,
    },
    { value: "homework", label: "Homework" },
    { value: "resources", label: "Resources" },
  ];
  return (
    <Stack gap="lg" maw={1100} mx="auto">
      <PageHeader
        breadcrumbs={[{ label: "My classes", href: "/teacher/classes" }]}
        eyebrow={[cls.session.name, cls.room].filter(Boolean).join(" · ")}
        title={cls.name}
        aside={
          mine ? (
            <>
              <Text component="span" fw={600} c="var(--mantine-color-text)">
                You
              </Text>{" "}
              are the class teacher
            </>
          ) : cls.classTeacherName ? (
            <>
              Class teacher{" "}
              <Text component="span" fw={500} c="var(--mantine-color-text)">
                {cls.classTeacherName}
              </Text>
            </>
          ) : (
            <>
              Class teacher <Nothing>none yet</Nothing>
            </>
          )
        }
      />
      <LinkTabs base={`/teacher/classes/${cls.id}`} tabs={tabs} />
      {children}
    </Stack>
  );
}
