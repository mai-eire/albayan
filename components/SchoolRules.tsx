import { Card, Stack, Typography } from "@mantine/core";
import { IconBook2 } from "@tabler/icons-react";
import { cleanRulesHtml } from "@/lib/rules";
import { EmptyState } from "./EmptyState";
import { PageHeader } from "./PageHeader";

// The school's rules as the office wrote them (Admin › School rules). One page for every
// area; the text is the same for everyone. The HTML is cleaned through the rules schema
// on the way in and again here, so only text and structure ever reach the page.
export function SchoolRules({ rules }: { rules: string | null }) {
  const html = cleanRulesHtml(rules);
  return (
    <Stack gap="lg" maw={720} mx="auto">
      <PageHeader title="School rules" />
      {!html ? (
        <EmptyState
          icon={<IconBook2 size={20} stroke={1.75} />}
          message="The school hasn't written its rules here yet."
        />
      ) : (
        <Card>
          <Typography maw={640}>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </Typography>
        </Card>
      )}
    </Stack>
  );
}
