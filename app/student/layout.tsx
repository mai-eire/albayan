import { Shell } from "@/components/Shell";
import { requireArea } from "@/lib/access";
import { getSchoolSettings } from "@/lib/db/queries/settings";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [user, { name }] = await Promise.all([requireArea("student"), getSchoolSettings()]);
  return (
    <Shell area="student" schoolName={name} user={{ name: user.name }} roles={user.areas}>
      {children}
    </Shell>
  );
}
