import { AuthPage } from "@/components/AuthPage";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { logoUrl } from "@/lib/logo";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Create an account" };

export default async function RegisterPage() {
  const { name, logoKey } = await getSchoolSettings();
  return (
    <AuthPage
      schoolName={name}
      logo={logoUrl(logoKey)}
      title="Create an account"
      links={[{ href: "/login", label: "Already have an account? Sign in" }]}
    >
      <RegisterForm />
    </AuthPage>
  );
}
