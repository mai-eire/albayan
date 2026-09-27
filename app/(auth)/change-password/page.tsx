import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthPage } from "@/components/AuthPage";
import { auth } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { logoUrl } from "@/lib/logo";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata = { title: "Change your password" };

export default async function ChangePasswordPage() {
  const [{ name, logoKey }, session] = await Promise.all([
    getSchoolSettings(),
    (await auth()).api.getSession({ headers: await headers() }),
  ]);
  if (!session) redirect("/login");
  return (
    <AuthPage
      schoolName={name}
      logo={logoUrl(logoKey)}
      title="Change your password"
      links={[{ href: "/logout", label: "Sign out" }]}
    >
      <ChangePasswordForm required={session.user.mustChangePassword === true} />
    </AuthPage>
  );
}
