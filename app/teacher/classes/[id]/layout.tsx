import { Stack } from "@mantine/core";
import { baseTab, LinkTabs } from "@/components/LinkTabs";
import { PageHeader } from "@/components/PageHeader";
import { loadTeacherClass } from "./load";

export default async function TeacherClassLayout({
  params,
  children,
}: LayoutProps<"/teacher/classes/[id]">) {
  const { cls } = await loadTeacherClass(params);
  const tabs = [
    {
      value: baseTab,
      label: "Students",
      count: cls.capacity === null ? cls.roster.length : `${cls.roster.length} / ${cls.capacity}`,
    },
    { value: "attendance", label: "Attendance" },
    { value: "homework", label: "Homework" },
    { value: "resources", label: "Resources" },
  ];
  return (
    <Stack gap="lg" maw={1100} mx="auto">
      <PageHeader
        breadcrumbs={[{ label: "My classes", href: "/teacher/classes" }]}
        eyebrow={[
          cls.session.name,
          cls.room,
          cls.classTeacherName && `Class teacher ${cls.classTeacherName}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        title={cls.name}
      />
      <LinkTabs base={`/teacher/classes/${cls.id}`} tabs={tabs} />
      {children}
    </Stack>
  );
}
