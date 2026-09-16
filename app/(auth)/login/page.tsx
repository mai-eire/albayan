import { AuthPage } from "@/components/AuthPage";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const { name } = await getSchoolSettings();
  return (
    <AuthPage
      schoolName={name}
      title="Sign in"
      links={[{ href: "/forgot-password", label: "Forgotten your password?" }]}
    >
      <LoginForm />
    </AuthPage>
  );
}
