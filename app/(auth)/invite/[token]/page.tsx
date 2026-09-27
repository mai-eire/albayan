import { Text } from "@mantine/core";
import { AuthPage } from "@/components/AuthPage";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { logoUrl } from "@/lib/logo";
import { findInvite } from "@/lib/invites";
import { InviteForm } from "./InviteForm";

export const metadata = { title: "Set up your account" };

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const [{ name, logoKey }, invite] = await Promise.all([
    getSchoolSettings(),
    findInvite(await auth(), await db(), token),
  ]);
  if (!invite) {
    return (
      <AuthPage
        schoolName={name}
        logo={logoUrl(logoKey)}
        title="Link expired"
        links={[{ href: "/login", label: "Go to sign in" }]}
      >
        <Text>This invite link is no longer valid. Ask the school office to send a new one.</Text>
      </AuthPage>
    );
  }
  return (
    <AuthPage
      schoolName={name}
      logo={logoUrl(logoKey)}
      title={`Welcome, ${invite.name.split(" ")[0]}`}
    >
      <InviteForm token={token} email={invite.email} />
    </AuthPage>
  );
}
