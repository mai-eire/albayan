import { Stack } from "@mantine/core";
import { notFound } from "next/navigation";
import { baseTab, LinkTabs } from "@/components/LinkTabs";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { OfferPlaceButton } from "@/app/admin/applications/OfferPlaceButton";
import { classChoice, getCurrentYear, listClasses } from "@/lib/db/queries/academics";
import { listApplications } from "@/lib/db/queries/applications";
import { familyOverviewFor } from "@/lib/db/queries/families";
import { listFeesForStudent } from "@/lib/db/queries/fees";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { getStudentForAdmin } from "@/lib/db/queries/students";
import { feeTabMark } from "@/lib/fees";
import { todayIn } from "@/lib/time";

// Everything the offer modal needs for an applicant, straight from their page.
async function offerProps(studentId: number) {
  const [[application], year, { timezone }] = await Promise.all([
    listApplications([studentId]),
    getCurrentYear(),
    getSchoolSettings(),
  ]);
  if (!application || !year) return null;
  const [classes, families] = await Promise.all([
    listClasses(year.id),
    familyOverviewFor([studentId], year.id),
  ]);
  return {
    application,
    classes: classes.map(classChoice),
    family: families.get(studentId) ?? [],
    standardFeeCents: year.standardFeeCents,
    today: todayIn(timezone),
  };
}

export default async function StudentLayout({
  params,
  children,
}: LayoutProps<"/admin/students/[id]">) {
  const id = Number((await params).id);
  const [student, fees] = await Promise.all([getStudentForAdmin(id), listFeesForStudent(id)]);
  if (!student) notFound();
  const thisYear = fees.find(
    (f) => f.enrolment.academicYearId === student.enrolment?.academicYearId,
  );
  const tabs = [
    { value: baseTab, label: "Details" },
    { value: "family", label: "Family" },
    { value: "sensitive", label: "Sensitive" },
    { value: "class", label: "Class" },
    { value: "fees", label: "Fees", mark: feeTabMark(thisYear?.status ?? null) },
    { value: "notes", label: "Notes" },
  ];
  const context = [student.studentId, student.enrolment?.className, student.enrolment?.sessionName]
    .filter(Boolean)
    .join(" · ");
  const offer = student.status === "applied" ? await offerProps(id) : null;
  return (
    <Stack gap="lg" maw={860}>
      <PageHeader
        breadcrumbs={[{ label: "Students", href: "/admin/students" }]}
        eyebrow={context || "Not yet placed"}
        title={`${student.firstName} ${student.lastName}`}
        badge={<StatusBadge domain="application" value={student.status} size="md" />}
        actions={offer && <OfferPlaceButton {...offer} />}
      />
      <LinkTabs base={`/admin/students/${id}`} tabs={tabs} />
      {children}
    </Stack>
  );
}
