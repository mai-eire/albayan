import { Stack } from "@mantine/core";
import { baseTab, LinkTabs } from "@/components/LinkTabs";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { loadStaffMember } from "./load";

export default async function StaffMemberLayout({
  params,
  children,
}: LayoutProps<"/admin/staff/[id]">) {
  const { person } = await loadStaffMember(params);
  const roles = [
    person.isAdmin && "Admin",
    person.teacher && (person.teacher.isActive ? "Teacher" : "Former teacher"),
  ].filter(Boolean);
  const tabs = [
    { value: baseTab, label: "Overview" },
    ...(person.teacher ? [{ value: "classes", label: "Classes" }] : []),
    { value: "notes", label: "Notes" },
  ];
  return (
    <Stack gap="lg" maw={960}>
      <PageHeader
        breadcrumbs={[{ label: "Staff", href: "/admin/staff" }]}
        eyebrow={roles.join(" · ")}
        title={person.name}
        badge={<StatusBadge domain="account" value={person.status} size="md" />}
      />
      <LinkTabs base={`/admin/staff/${person.id}`} tabs={tabs} />
      {children}
    </Stack>
  );
}
