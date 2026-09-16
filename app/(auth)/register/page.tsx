import { AuthPage } from "@/components/AuthPage";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Create an account" };

export default async function RegisterPage() {
  const { name } = await getSchoolSettings();
  return (
    <AuthPage
      schoolName={name}
      title="Create an account"
      links={[{ href: "/login", label: "Already have an account? Sign in" }]}
    >
      <RegisterForm />
    </AuthPage>
  );
}
