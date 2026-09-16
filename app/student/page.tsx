import { Stack } from "@mantine/core";
import { IconBook } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { requireArea } from "@/lib/access";

export const metadata = { title: "Home" };

export default async function StudentHome() {
  const user = await requireArea("student");
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader
        eyebrow="Tuesday 16 September"
        title={`Hi, ${user.student?.firstName ?? user.name.split(" ")[0]}`}
      />
      <EmptyState
        icon={<IconBook size={20} stroke={1.75} />}
        message="Nothing due. Enjoy your day."
      />
    </Stack>
  );
}
