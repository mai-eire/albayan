import { Stack } from "@mantine/core";
import { notFound } from "next/navigation";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { baseTab, LinkTabs } from "@/components/LinkTabs";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { isGuardianOf, loadStudentFacts, requireArea } from "@/lib/access";
import { attendanceTally } from "@/lib/db/queries/attendance";
import { feeForChild, getStudentForGuardian } from "@/lib/db/queries/family";
import { listPublishedHomeworkForClass } from "@/lib/db/queries/homework";
import { listNotesForGuardian } from "@/lib/db/queries/notes";
import { listResourcesForChild } from "@/lib/db/queries/resources";
import { listChildrenForGuardian } from "@/lib/db/queries/students";
import { feeTabMark } from "@/lib/fees";

export default async function ChildLayout({ params, children }: LayoutProps<"/family/[id]">) {
  const id = Number((await params).id);
  const [user, facts] = await Promise.all([requireArea("family"), loadStudentFacts(id)]);
  if (!facts || !user.guardian || !isGuardianOf(user, facts)) notFound();
  const [child, kids] = await Promise.all([
    getStudentForGuardian(id),
    listChildrenForGuardian(user.guardian.id),
  ]);
  if (!child) notFound();
  // Counts on the tabs, so a parent sees what is inside before opening it (§4.12).
  const [attendance, homework, notes, resources, fee] = await Promise.all([
    attendanceTally(id),
    child.place ? listPublishedHomeworkForClass(child.place.classId) : [],
    listNotesForGuardian(id),
    listResourcesForChild(id, child.place?.classId ?? null, "guardian"),
    feeForChild(id),
  ]);
  const tabs = [
    { value: baseTab, label: "Details" },
    { value: "timetable", label: "Timetable" },
    {
      value: "attendance",
      label: "Attendance",
      count: attendance.total ? `${attendance.present} / ${attendance.total}` : undefined,
    },
    { value: "homework", label: "Homework", count: homework.length || undefined },
    { value: "notes", label: "Notes", count: notes.length || undefined },
    { value: "resources", label: "Resources", count: resources.length || undefined },
    { value: "fees", label: "Fees", mark: feeTabMark(fee?.status ?? null) },
    { value: "application", label: "Application" },
  ];
  return (
    <Stack gap="lg" maw={860} mx="auto">
      <ChildSwitcher kids={kids} />
      <PageHeader
        breadcrumbs={[{ label: "Your family", href: "/family" }]}
        title={child.firstName}
        aside={child.place ? `${child.place.className} · ${child.place.sessionName}` : undefined}
        badge={<StatusBadge domain="application" value={child.status} size="md" />}
      />
      <LinkTabs base={`/family/${id}`} tabs={tabs} />
      {children}
    </Stack>
  );
}
