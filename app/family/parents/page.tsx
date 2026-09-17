import { Card, Stack } from "@mantine/core";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { requireArea } from "@/lib/access";
import { listChildrenForGuardian } from "@/lib/db/queries/students";
import { addParent } from "./actions";
import { AddParentForm } from "./AddParentForm";

export const metadata = { title: "Add another parent" };

export default async function AddParentPage() {
  const user = await requireArea("family");
  if (!user.emailVerified || !user.guardian) redirect("/family");
  const kids = await listChildrenForGuardian(user.guardian.id);
  if (kids.length === 0) redirect("/family");
  return (
    <Stack gap="lg" maw={720} mx="auto">
      <PageHeader
        title="Add another parent"
        eyebrow="Give the other parent, or a grandparent, their own sign-in"
      />
      <Card>
        <AddParentForm kids={kids} submit={addParent} />
      </Card>
    </Stack>
  );
}
