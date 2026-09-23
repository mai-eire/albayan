import { Card, Stack } from "@mantine/core";
import { IconUserPlus } from "@tabler/icons-react";
import { CardTitle } from "@/components/CardTitle";
import { EmptyState } from "@/components/EmptyState";
import { EntityList } from "@/components/EntityList";
import { LinkButton } from "@/components/LinkButton";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { requireArea } from "@/lib/access";
import { listChildrenForGuardian, listCoGuardians } from "@/lib/db/queries/students";
import { relationshipLabels } from "@/lib/demographics";
import { VerifyEmailNotice } from "./VerifyEmailNotice";

export const metadata = { title: "Overview" };

const detail = {
  applied: "Application received",
  active: "Attending",
  inactive: "No longer attending",
  declined: "Application not accepted",
};

// "Mother of Amira and Yusuf" — the same sentence however many children they share.
function sharedWith(relationship: string, names: string[]) {
  const label = relationshipLabels[relationship as keyof typeof relationshipLabels];
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
  return `${label} of ${list}`;
}

export default async function FamilyOverview() {
  const user = await requireArea("family");
  const kids = user.guardian ? await listChildrenForGuardian(user.guardian.id) : [];
  const others = user.guardian ? await listCoGuardians(user.guardian.id) : [];
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader
        title="Your family"
        actions={
          user.emailVerified && kids.length > 0 ? (
            <LinkButton href="/family/register-child" variant="light">
              Register another child
            </LinkButton>
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
        <>
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
          <Card>
            <CardTitle
              context={
                user.emailVerified && (
                  <LinkButton href="/family/parents" variant="subtle" size="xs">
                    Add another parent
                  </LinkButton>
                )
              }
            >
              Parents and guardians
            </CardTitle>
            <EntityList
              items={[
                {
                  key: "you",
                  title: `${user.name} (you)`,
                  detail: "Signed in",
                },
                ...others.map((g) => ({
                  key: g.id,
                  title: g.name,
                  detail: sharedWith(g.relationship, g.childNames),
                  badge: g.signedIn ? undefined : <StatusBadge domain="account" value="invited" />,
                })),
              ]}
            />
          </Card>
        </>
      )}
    </Stack>
  );
}
