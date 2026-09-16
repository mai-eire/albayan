import { Card, Group, Stack, Text, Title } from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import { relationshipLabels } from "@/lib/demographics";
import { loadStudent } from "../load";

type Props = { params: Promise<{ id: string }> };

export default async function StudentGuardiansPage({ params }: Props) {
  const student = await loadStudent(params);
  return (
    <Stack gap="lg">
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
    </Stack>
  );
}
