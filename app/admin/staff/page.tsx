import { Group, Stack } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/current-user";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { listStaff } from "@/lib/db/queries/staff";
import { InviteButton } from "./InviteForm";
import { ShowFormerToggle } from "./ShowFormerToggle";
import { StaffTable } from "./StaffTable";

export const metadata = { title: "Staff" };

type Props = { searchParams: Promise<{ show?: string }> };

export default async function StaffPage({ searchParams }: Props) {
  const { show } = await searchParams;
  const includeFormer = show === "all";
  const [staff, me, { timezone }] = await Promise.all([
    listStaff(includeFormer),
    getCurrentUser(),
    getSchoolSettings(),
  ]);
  const former = staff.filter((s) => s.teacher && !s.teacher.isActive && !s.isAdmin).length;
  return (
    <Stack gap="lg" maw={1100}>
      <PageHeader
        title="Staff"
        eyebrow={
          includeFormer && former
            ? `${staff.length} people, ${former} no longer teaching`
            : `${staff.length} people`
        }
        actions={
          <Group gap="sm">
            <ShowFormerToggle checked={includeFormer} />
            <InviteButton />
          </Group>
        }
      />
      <StaffTable staff={staff} currentUserId={me?.id ?? 0} timezone={timezone} />
    </Stack>
  );
}
