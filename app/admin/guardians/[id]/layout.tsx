import { Stack } from "@mantine/core";
import { notFound } from "next/navigation";
import { baseTab, LinkTabs } from "@/components/LinkTabs";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentYear, listSessions } from "@/lib/db/queries/academics";
import { getGuardianForAdmin } from "@/lib/db/queries/students";
import { AddChildButton } from "./AddChildButton";

const tabs = [
  { value: baseTab, label: "Details" },
  { value: "payments", label: "Payments" },
];

export default async function GuardianLayout({
  params,
  children,
}: LayoutProps<"/admin/guardians/[id]">) {
  const id = Number((await params).id);
  const [guardian, year] = await Promise.all([getGuardianForAdmin(id), getCurrentYear()]);
  if (!guardian) notFound();
  const sessions = year ? (await listSessions(year.id)).filter((s) => s.isActive) : [];
  return (
    <Stack gap="lg" maw={860}>
      <PageHeader
        breadcrumbs={[{ label: "Guardians", href: "/admin/guardians" }]}
        eyebrow={guardian.emailVerified ? undefined : "Email not confirmed"}
        title={guardian.name}
        actions={
          <AddChildButton
            guardian={{ id: guardian.id, name: guardian.name, gender: guardian.gender }}
            sessions={sessions.map((s) => ({ id: s.id, name: s.name }))}
          />
        }
      />
      <LinkTabs base={`/admin/guardians/${id}`} tabs={tabs} />
      {children}
    </Stack>
  );
}
