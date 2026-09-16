import { Card, SimpleGrid, Stack, Text } from "@mantine/core";
import { notFound } from "next/navigation";
import { CardTitle } from "@/components/CardTitle";
import { Field } from "@/components/Field";
import { EntityList } from "@/components/EntityList";
import { PageHeader } from "@/components/PageHeader";
import { SensitiveSection } from "@/components/SensitiveSection";
import { StatusBadge } from "@/components/StatusBadge";
import { getGuardianForAdmin } from "@/lib/db/queries/students";
import { reasonLabels, relationshipLabels } from "@/lib/demographics";

type Props = { params: Promise<{ id: string }> };

export default async function GuardianPage({ params }: Props) {
  const guardian = await getGuardianForAdmin(Number((await params).id));
  if (!guardian) notFound();
  const s = guardian.sensitive;
  return (
    <Stack gap="lg" maw={860}>
      <PageHeader
        eyebrow={guardian.emailVerified ? "Guardian" : "Guardian · email not confirmed"}
        title={guardian.name}
      />
      <Card>
        <CardTitle>Contact</CardTitle>
        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
          <Field label="Email" value={guardian.email} />
          <Field label="Phone" value={guardian.phone ?? "—"} />
          <Field
            label="Emergency contact"
            value={
              guardian.emergencyContactName
                ? `${guardian.emergencyContactName} (${guardian.emergencyContactRelationship}) · ${guardian.emergencyContactPhone}`
                : "Not given"
            }
          />
        </SimpleGrid>
      </Card>
      <Card>
        <CardTitle>Children</CardTitle>
        {guardian.children.length === 0 ? (
          <Text size="sm" c="dimmed">
            No children registered.
          </Text>
        ) : (
          <EntityList
            items={guardian.children.map((c) => ({
              key: c.id,
              title: `${c.firstName} ${c.lastName}`,
              detail: [
                relationshipLabels[c.relationship as keyof typeof relationshipLabels],
                c.className,
              ]
                .filter(Boolean)
                .join(" · "),
              badge: <StatusBadge domain="application" value={c.status} />,
              href: `/admin/students/${c.id}`,
            }))}
          />
        )}
      </Card>
      <SensitiveSection>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <Field label="Address" value={s.address ?? "Not given"} />
          <Field
            label="Languages at home"
            value={s.spokenLanguages.length ? s.spokenLanguages.join(", ") : "Not given"}
          />
          <Field label="Ethnicity" value={s.ethnicity ?? "Prefer not to say"} />
          <Field
            label="Reasons for registering"
            value={
              s.registrationReasons.length
                ? s.registrationReasons
                    .map((r) =>
                      r === "other" && s.registrationReasonOther
                        ? s.registrationReasonOther
                        : reasonLabels[r as keyof typeof reasonLabels],
                    )
                    .join(", ")
                : "Not given"
            }
          />
        </SimpleGrid>
      </SensitiveSection>
    </Stack>
  );
}
