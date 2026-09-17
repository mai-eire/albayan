import { Card, SimpleGrid, Stack, Text } from "@mantine/core";
import { notFound } from "next/navigation";
import { CardTitle } from "@/components/CardTitle";
import { EditableCard } from "@/components/EditableCard";
import { EntityList } from "@/components/EntityList";
import { Field } from "@/components/Field";
import { SensitiveSection } from "@/components/SensitiveSection";
import { StatusBadge } from "@/components/StatusBadge";
import { getGuardianForAdmin } from "@/lib/db/queries/students";
import { guardianGenderOptions, reasonLabels, relationshipLabels } from "@/lib/demographics";
import { ContactForm, SensitiveForm } from "./forms";

type Props = { params: Promise<{ id: string }> };

export default async function GuardianPage({ params }: Props) {
  const guardian = await getGuardianForAdmin(Number((await params).id));
  if (!guardian) notFound();
  const s = guardian.sensitive;
  return (
    <Stack gap="lg">
      <EditableCard
        title="Contact"
        view={
          <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="md">
            <Field label="Email" value={guardian.email} />
            <Field label="Phone" value={guardian.phone} />
            <Field
              label="Gender"
              value={
                guardianGenderOptions.find((g) => g.value === guardian.gender)?.label ??
                "Prefer not to say"
              }
            />
            <Field
              label="Emergency contact"
              value={
                guardian.emergencyContactName
                  ? `${guardian.emergencyContactName} (${guardian.emergencyContactRelationship}) · ${guardian.emergencyContactPhone}`
                  : "Not given"
              }
            />
          </SimpleGrid>
        }
      >
        <ContactForm guardian={guardian} />
      </EditableCard>
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
        <EditableCard
          title="About the family"
          view={
            <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="md">
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
                            : reasonLabels[r],
                        )
                        .join(", ")
                    : "Not given"
                }
              />
            </SimpleGrid>
          }
        >
          <SensitiveForm guardian={guardian} />
        </EditableCard>
      </SensitiveSection>
    </Stack>
  );
}
