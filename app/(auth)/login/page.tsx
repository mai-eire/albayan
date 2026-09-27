import { AuthPage } from "@/components/AuthPage";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { logoUrl } from "@/lib/logo";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const { name, logoKey } = await getSchoolSettings();
  return (
    <AuthPage
      schoolName={name}
      logo={logoUrl(logoKey)}
      title="Sign in"
      links={[
        { href: "/forgot-password", label: "Forgotten your password?" },
        { href: "/register", label: "New here? Create an account" },
      ]}
    >
      <LoginForm />
    </AuthPage>
  );
}
