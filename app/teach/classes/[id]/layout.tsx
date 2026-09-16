import { Stack } from "@mantine/core";
import { baseTab, LinkTabs } from "@/components/LinkTabs";
import { PageHeader } from "@/components/PageHeader";
import { loadTeacherClass } from "./load";

const tabs = [
  { value: baseTab, label: "Students" },
  { value: "attendance", label: "Attendance" },
  { value: "homework", label: "Homework" },
  { value: "resources", label: "Resources" },
];

export default async function TeacherClassLayout({
  params,
  children,
}: LayoutProps<"/teach/classes/[id]">) {
  const { cls } = await loadTeacherClass(params);
  return (
    <Stack gap="lg" maw={1100} mx="auto">
      <PageHeader
        eyebrow={[
          cls.session.name,
          cls.room,
          cls.classTeacherName && `Class teacher ${cls.classTeacherName}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        title={cls.name}
      />
      <LinkTabs base={`/teach/classes/${cls.id}`} tabs={tabs} />
      {children}
    </Stack>
  );
}
