import { Card, Stack } from "@mantine/core";
import { IconUserPlus } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { EntityList } from "@/components/EntityList";
import { LinkButton } from "@/components/LinkButton";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { requireArea } from "@/lib/access";
import { listChildrenForGuardian } from "@/lib/db/queries/students";
import { VerifyEmailNotice } from "./VerifyEmailNotice";

export const metadata = { title: "Overview" };

const detail = {
  applied: "Application received",
  active: "Attending",
  inactive: "No longer attending",
  declined: "Application not accepted",
};

export default async function FamilyOverview() {
  const user = await requireArea("family");
  const kids = user.guardian ? await listChildrenForGuardian(user.guardian.id) : [];
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader
        title="Your family"
        actions={
          user.emailVerified && kids.length > 0 ? (
            <>
              <LinkButton href="/family/parents" variant="light">
                Add another parent
              </LinkButton>
              <LinkButton href="/family/register-child" variant="light">
                Register another child
              </LinkButton>
            </>
          ) : undefined
        }
      />
      {!user.emailVerified && <VerifyEmailNotice email={user.email} />}
      {kids.length === 0 ? (
        <EmptyState
          icon={<IconUserPlus size={20} stroke={1.75} />}
          message="No children registered yet."
          action={
            user.emailVerified ? (
              <LinkButton href="/family/register-child">Register a child</LinkButton>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <EntityList
            items={kids.map((kid) => ({
              key: kid.id,
              title: `${kid.firstName} ${kid.lastName}`,
              detail: kid.preferredSessionName
                ? `${detail[kid.status]} · ${kid.preferredSessionName}`
                : detail[kid.status],
              badge: <StatusBadge domain="application" value={kid.status} />,
              href: `/family/${kid.id}`,
            }))}
          />
        </Card>
      )}
    </Stack>
  );
}
