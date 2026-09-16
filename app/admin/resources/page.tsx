import { Card, Stack } from "@mantine/core";
import { IconFolder } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ShareResourceButton } from "@/components/ResourceForm";
import { ResourceList } from "@/components/ResourceList";
import { listSchoolWideResources } from "@/lib/db/queries/resources";

export const metadata = { title: "Resources" };

// School-wide documents: the calendar, policies, forms. Class material lives on classes.
export default async function AdminResourcesPage() {
  const items = await listSchoolWideResources();
  return (
    <Stack gap="lg" maw={860}>
      <PageHeader
        title="Resources"
        eyebrow="Shared with the whole school"
        actions={<ShareResourceButton target={{ kind: "school" }} />}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={<IconFolder size={20} stroke={1.75} />}
          message="Nothing shared with the whole school yet."
        />
      ) : (
        <Card>
          <ResourceList items={items.map((r) => ({ ...r, removable: true }))} />
        </Card>
      )}
    </Stack>
  );
}
