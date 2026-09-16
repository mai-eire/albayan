import { AuthPage } from "@/components/AuthPage";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = { title: "Forgotten password" };

export default async function ForgotPasswordPage() {
  const { name } = await getSchoolSettings();
  return (
    <AuthPage
      schoolName={name}
      title="Reset your password"
      links={[{ href: "/login", label: "Back to sign in" }]}
    >
      <ForgotPasswordForm />
    </AuthPage>
  );
}
