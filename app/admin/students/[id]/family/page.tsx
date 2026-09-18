import { Card, Group, Stack, Text, Title } from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import { EntityList } from "@/components/EntityList";
import { StatusBadge } from "@/components/StatusBadge";
import { AddGuardianButton } from "@/app/admin/guardians/AddGuardianButton";
import { listGuardiansForAdmin, listSiblingsForAdmin } from "@/lib/db/queries/students";
import { relationshipLabels } from "@/lib/demographics";
import { loadStudent } from "../load";

type Props = { params: Promise<{ id: string }> };

// The student's guardians with how to reach them, and the brothers and sisters they share.
export default async function StudentFamilyPage({ params }: Props) {
  const student = await loadStudent(params);
  const [siblings, everyone] = await Promise.all([
    listSiblingsForAdmin(student.id),
    listGuardiansForAdmin(),
  ]);
  const linked = new Set(student.guardians.map((g) => g.id));
  return (
    <Stack gap="lg">
      <Group justify="flex-end">
        <AddGuardianButton
          kids={[{ id: student.id, firstName: student.firstName }]}
          guardians={everyone
            .filter((g) => !linked.has(g.id))
            .map(({ id, name, email, phone }) => ({ id, name, email, phone }))}
          label="Add guardian"
          title={`Add a guardian for ${student.firstName}`}
        />
      </Group>
      {student.guardians.map((g) => (
        <Card key={g.id}>
          <CardTitle
            context={
              g.isPrimaryContact ? (
                <Text size="sm" c="dimmed">
                  First contact
                </Text>
              ) : undefined
            }
          >
            <AppLink href={`/admin/guardians/${g.id}`} c="inherit">
              {g.name}
            </AppLink>
          </CardTitle>
          <Text size="sm">
            {relationshipLabels[g.relationship as keyof typeof relationshipLabels]} · {g.email}
            {g.phone && ` · ${g.phone}`}
          </Text>
          <Group mt="md" gap="xs" align="baseline">
            <Title order={4}>Emergency contact</Title>
          </Group>
          <Text size="sm">
            {g.emergencyContactName
              ? `${g.emergencyContactName} (${g.emergencyContactRelationship}) · ${g.emergencyContactPhone}`
              : "Not given"}
          </Text>
        </Card>
      ))}
      {siblings.length > 0 && (
        <Card>
          <CardTitle>Also in this family</CardTitle>
          <EntityList
            items={siblings.map((s) => ({
              key: s.id,
              title: `${s.firstName} ${s.lastName}`,
              detail: [s.studentId, s.className, s.sessionName].filter(Boolean).join(" · "),
              badge: <StatusBadge domain="application" value={s.status} />,
              href: `/admin/students/${s.id}`,
            }))}
          />
        </Card>
      )}
    </Stack>
  );
}
