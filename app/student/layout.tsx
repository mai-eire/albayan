import { Shell } from "@/components/Shell";
import { requireArea } from "@/lib/access";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireArea("student");
  return (
    <Shell area="student" user={{ name: user.name }} roles={user.areas}>
      {children}
    </Shell>
  );
}
