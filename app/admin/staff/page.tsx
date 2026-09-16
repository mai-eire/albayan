import { Stack } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/current-user";
import { listStaff } from "@/lib/db/queries/staff";
import { InviteButton } from "./InviteForm";
import { StaffTable } from "./StaffTable";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const [staff, me] = await Promise.all([listStaff(), getCurrentUser()]);
  return (
    <Stack gap="lg" maw={860}>
      <PageHeader title="Staff" actions={<InviteButton />} />
      <StaffTable staff={staff} currentUserId={me?.id ?? 0} />
    </Stack>
  );
}
