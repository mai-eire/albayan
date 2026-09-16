import { Stack } from "@mantine/core";
import { notFound } from "next/navigation";
import { baseTab, LinkTabs } from "@/components/LinkTabs";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { getStudentForAdmin } from "@/lib/db/queries/students";

const tabs = [
  { value: baseTab, label: "Details" },
  { value: "guardians", label: "Guardians" },
  { value: "sensitive", label: "Sensitive" },
  { value: "enrolment", label: "Enrolment" },
  { value: "fees", label: "Fees" },
  { value: "notes", label: "Notes" },
];

export default async function StudentLayout({
  params,
  children,
}: LayoutProps<"/admin/students/[id]">) {
  const id = Number((await params).id);
  const student = await getStudentForAdmin(id);
  if (!student) notFound();
  const context = [student.studentId, student.enrolment?.className, student.enrolment?.sessionName]
    .filter(Boolean)
    .join(" · ");
  return (
    <Stack gap="lg" maw={860}>
      <PageHeader
        eyebrow={context || "Not yet placed"}
        title={`${student.firstName} ${student.lastName}`}
        actions={<StatusBadge domain="application" value={student.status} size="md" />}
      />
      <LinkTabs base={`/admin/students/${id}`} tabs={tabs} />
      {children}
    </Stack>
  );
}
