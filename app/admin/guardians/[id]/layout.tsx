import { Stack } from "@mantine/core";
import { notFound } from "next/navigation";
import { baseTab, LinkTabs } from "@/components/LinkTabs";
import { PageHeader } from "@/components/PageHeader";
import { getGuardianForAdmin } from "@/lib/db/queries/students";

const tabs = [
  { value: baseTab, label: "Details" },
  { value: "payments", label: "Payments" },
];

export default async function GuardianLayout({
  params,
  children,
}: LayoutProps<"/admin/guardians/[id]">) {
  const id = Number((await params).id);
  const guardian = await getGuardianForAdmin(id);
  if (!guardian) notFound();
  return (
    <Stack gap="lg" maw={860}>
      <PageHeader
        eyebrow={guardian.emailVerified ? "Guardian" : "Guardian · email not confirmed"}
        title={guardian.name}
      />
      <LinkTabs base={`/admin/guardians/${id}`} tabs={tabs} />
      {children}
    </Stack>
  );
}
