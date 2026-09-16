import { Stack } from "@mantine/core";
import { IconUserPlus } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/LinkButton";
import { PageHeader } from "@/components/PageHeader";
import { requireArea } from "@/lib/access";
import { VerifyEmailNotice } from "./VerifyEmailNotice";

export const metadata = { title: "Overview" };

export default async function FamilyOverview() {
  const user = await requireArea("family");
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader title="Your family" />
      {!user.emailVerified && <VerifyEmailNotice email={user.email} />}
      <EmptyState
        icon={<IconUserPlus size={20} stroke={1.75} />}
        message="No children registered yet."
        action={
          user.emailVerified ? (
            <LinkButton href="/family/register-child">Register a child</LinkButton>
          ) : undefined
        }
      />
    </Stack>
  );
}
