import { Stack } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { logoUrl } from "@/lib/logo";
import { LogoCard } from "./LogoCard";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getSchoolSettings();
  return (
    <Stack gap="lg" maw={720} mx="auto">
      <PageHeader title="Settings" />
      <LogoCard logo={logoUrl(settings.logoKey)} />
      <SettingsForm settings={settings} />
    </Stack>
  );
}
