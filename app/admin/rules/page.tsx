import { Stack } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { cleanRulesHtml } from "@/lib/rules";
import { RulesEditor } from "./RulesEditor";

export const metadata = { title: "School rules" };

export default async function AdminRulesPage() {
  const { rules } = await getSchoolSettings();
  return (
    <Stack gap="lg" maw={840} mx="auto">
      <PageHeader title="School rules" />
      <RulesEditor rules={cleanRulesHtml(rules)} />
    </Stack>
  );
}
