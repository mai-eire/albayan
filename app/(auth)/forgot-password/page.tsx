import { AuthPage } from "@/components/AuthPage";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { logoUrl } from "@/lib/logo";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = { title: "Forgotten password" };

export default async function ForgotPasswordPage() {
  const { name, logoKey } = await getSchoolSettings();
  return (
    <AuthPage
      schoolName={name}
      logo={logoUrl(logoKey)}
      title="Reset your password"
      links={[{ href: "/login", label: "Back to sign in" }]}
    >
      <ForgotPasswordForm />
    </AuthPage>
  );
}
