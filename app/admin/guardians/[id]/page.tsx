import { Card, SimpleGrid, Stack, Text } from "@mantine/core";
import { notFound } from "next/navigation";
import { CardTitle } from "@/components/CardTitle";
import { EditableCard } from "@/components/EditableCard";
import { EntityList } from "@/components/EntityList";
import { Field } from "@/components/Field";
import { StatusBadge } from "@/components/StatusBadge";
import { getGuardianForAdmin, listCoGuardians } from "@/lib/db/queries/students";
import { guardianGenderOptions, relationshipLabels } from "@/lib/demographics";
import { ContactForm } from "./forms";

type Props = { params: Promise<{ id: string }> };

export default async function GuardianPage({ params }: Props) {
  const id = Number((await params).id);
  const [guardian, coGuardians] = await Promise.all([getGuardianForAdmin(id), listCoGuardians(id)]);
  if (!guardian) notFound();
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
                c.className && `${c.className} · ${c.sessionName}`,
              ]
                .filter(Boolean)
                .join(" · "),
              badge: <StatusBadge domain="application" value={c.status} />,
              href: `/admin/students/${c.id}`,
            }))}
          />
        )}
      </Card>
      {coGuardians.length > 0 && (
        <Card>
          <CardTitle>Also in this family</CardTitle>
          <EntityList
            items={coGuardians.map((g) => ({
              key: g.id,
              title: g.name,
              detail: `${relationshipLabels[g.relationship as keyof typeof relationshipLabels]} of ${g.childNames.join(", ")}`,
              href: `/admin/guardians/${g.id}`,
            }))}
          />
        </Card>
      )}
    </Stack>
  );
}
