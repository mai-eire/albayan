import { Stack } from "@mantine/core";
import { notFound } from "next/navigation";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { baseTab, LinkTabs } from "@/components/LinkTabs";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { isGuardianOf, loadStudentFacts, requireArea } from "@/lib/access";
import { getStudentForGuardian } from "@/lib/db/queries/family";
import { listChildrenForGuardian } from "@/lib/db/queries/students";

const tabs = [
  { value: baseTab, label: "Overview" },
  { value: "timetable", label: "Timetable" },
  { value: "attendance", label: "Attendance" },
  { value: "homework", label: "Homework" },
  { value: "notes", label: "Notes" },
  { value: "resources", label: "Resources" },
  { value: "details", label: "Details" },
];

export default async function ChildLayout({ params, children }: LayoutProps<"/family/[id]">) {
  const id = Number((await params).id);
  const [user, facts] = await Promise.all([requireArea("family"), loadStudentFacts(id)]);
  if (!facts || !user.guardian || !isGuardianOf(user, facts)) notFound();
  const [child, kids] = await Promise.all([
    getStudentForGuardian(id),
    listChildrenForGuardian(user.guardian.id),
  ]);
  if (!child) notFound();
  return (
    <Stack gap="lg" maw={860} mx="auto">
      <ChildSwitcher kids={kids} />
      <PageHeader
        eyebrow={child.place ? `${child.place.className} · ${child.place.sessionName}` : undefined}
        title={child.firstName}
        actions={<StatusBadge domain="application" value={child.status} size="md" />}
      />
      <LinkTabs base={`/family/${id}`} tabs={tabs} />
      {children}
    </Stack>
  );
}
