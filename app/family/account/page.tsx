import { Stack } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { requireArea } from "@/lib/access";
import { getGuardianSelf } from "@/lib/db/queries/students";
import { AccountForm } from "./AccountForm";

export const metadata = { title: "Your account" };

export default async function AccountPage() {
  const user = await requireArea("family");
  const guardian = user.guardian ? await getGuardianSelf(user.guardian.id) : null;
  return (
    <Stack gap="lg" maw={720} mx="auto">
      <PageHeader title="Your account" eyebrow={user.email} />
      <AccountForm
        user={{ name: user.name, phone: user.phone, emailNotifications: user.emailNotifications }}
        guardian={guardian ?? null}
      />
    </Stack>
  );
}
