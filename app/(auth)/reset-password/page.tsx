import { Text } from "@mantine/core";
import { AuthPage } from "@/components/AuthPage";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = { title: "Choose a new password" };

type Props = { searchParams: Promise<{ token?: string; error?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const [{ name }, { token, error }] = await Promise.all([getSchoolSettings(), searchParams]);
  const links = [{ href: "/forgot-password", label: "Request a new link" }];
  if (!token || error) {
    return (
      <AuthPage schoolName={name} title="Link expired" links={links}>
        <Text>This password link is no longer valid. Request a new one and try again.</Text>
      </AuthPage>
    );
  }
  return (
    <AuthPage schoolName={name} title="Choose a new password" links={links}>
      <ResetPasswordForm token={token} />
    </AuthPage>
  );
}
