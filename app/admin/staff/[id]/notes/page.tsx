import { Card, Stack, Text } from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import { categoryLabels } from "@/lib/note-labels";
import { formatDate } from "@/lib/time";
import { loadStaffMember } from "../load";

type Props = { params: Promise<{ id: string }> };

export default async function StaffNotesPage({ params }: Props) {
  const { person, timezone } = await loadStaffMember(params);
  return (
    <Card>
      <CardTitle>
        Notes written
        <Text component="span" c="dimmed" fw={400}>
          {" "}
          {person.noteCount}
        </Text>
      </CardTitle>
      {person.notes.length === 0 ? (
        <Text size="sm" c="dimmed">
          None yet.
        </Text>
      ) : (
        <Stack gap="sm">
          {person.notes.map((n) => (
            <div key={n.id}>
              <Text size="sm" c="dimmed">
                <AppLink href={`/admin/students/${n.studentId}/notes`} size="sm">
                  {n.studentName}
                </AppLink>{" "}
                · {categoryLabels[n.category as keyof typeof categoryLabels]} ·{" "}
                {formatDate(n.createdAt, timezone, true)}
              </Text>
              <Text size="sm" lineClamp={2}>
                {n.body}
              </Text>
            </div>
          ))}
        </Stack>
      )}
    </Card>
  );
}
