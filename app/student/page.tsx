import { Stack } from "@mantine/core";
import { IconBook } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Home" };

export default function StudentHome() {
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader eyebrow="Tuesday 16 September" title="Hi, Yusuf" />
      <EmptyState
        icon={<IconBook size={20} stroke={1.75} />}
        message="Nothing due. Enjoy your day."
      />
    </Stack>
  );
}
