import { Stack } from "@mantine/core";
import { IconUserPlus } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/LinkButton";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Overview" };

export default function FamilyOverview() {
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader title="Your family" />
      <EmptyState
        icon={<IconUserPlus size={20} stroke={1.75} />}
        message="No children registered yet."
        action={<LinkButton href="/family/register-child">Register a child</LinkButton>}
      />
    </Stack>
  );
}
