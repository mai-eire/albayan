import { Stack } from "@mantine/core";
import { baseTab, LinkTabs } from "@/components/LinkTabs";
import { PageHeader } from "@/components/PageHeader";
import { loadTeacherStudent } from "./load";

const tabs = [
  { value: baseTab, label: "Overview" },
  { value: "attendance", label: "Attendance" },
  { value: "notes", label: "Notes" },
  { value: "resources", label: "Resources" },
];

export default async function TeacherStudentLayout({
  params,
  children,
}: LayoutProps<"/teach/students/[id]">) {
  const { student, facts } = await loadTeacherStudent(params);
  return (
    <Stack gap="lg" maw={860} mx="auto">
      <PageHeader
        breadcrumbs={[
          { label: "My classes", href: "/teach/classes" },
          ...(facts.activeClass && student.className
            ? [{ label: student.className, href: `/teach/classes/${facts.activeClass.id}` }]
            : []),
        ]}
        eyebrow={student.sessionName ?? undefined}
        title={`${student.firstName} ${student.lastName}`}
      />
      <LinkTabs base={`/teach/students/${student.id}`} tabs={tabs} />
      {children}
    </Stack>
  );
}
