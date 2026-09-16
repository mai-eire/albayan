import { Card, Stack, Text, Title } from "@mantine/core";
import { redirect } from "next/navigation";
import { LinkButton } from "@/components/LinkButton";
import { requireUser } from "@/lib/access";

// Signed-in users go to their first area. A user with no role yet sees why.
export default async function Home() {
  const user = await requireUser();
  if (user.areas[0]) redirect(`/${user.areas[0]}`);
  return (
    <Stack align="center" p="xl">
      <Card maw={420} w="100%">
        <Title order={2} mb="sm">
          Nothing here yet
        </Title>
        <Text mb="md">
          Your account isn&apos;t linked to a child, a class or the office yet. If you think it
          should be, contact the school office.
        </Text>
        <LinkButton href="/logout" variant="light">
          Sign out
        </LinkButton>
      </Card>
    </Stack>
  );
}
