import { Shell } from "@/components/Shell";
import { requireArea } from "@/lib/access";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireArea("admin");
  return (
    <Shell area="admin" user={{ name: user.name }} roles={user.areas}>
      {children}
    </Shell>
  );
}
