import { Card, Stack, Text } from "@mantine/core";
import { IconBook2 } from "@tabler/icons-react";
import { EmptyState } from "./EmptyState";
import { PageHeader } from "./PageHeader";

// The school's rules as the office wrote them (Settings), paragraph by paragraph. One page
// for every area; the text is the same for everyone.
export function SchoolRules({ rules }: { rules: string | null }) {
  const paragraphs = (rules ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <Stack gap="lg" maw={720} mx="auto">
      <PageHeader title="School rules" />
      {paragraphs.length === 0 ? (
        <EmptyState
          icon={<IconBook2 size={20} stroke={1.75} />}
          message="The school hasn't written its rules here yet."
        />
      ) : (
        <Card>
          <Stack gap="md" maw={640}>
            {paragraphs.map((p, i) => (
              <Text key={i} style={{ whiteSpace: "pre-line" }}>
                {p}
              </Text>
            ))}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
