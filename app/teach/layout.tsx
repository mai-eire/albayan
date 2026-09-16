import { Shell } from "@/components/Shell";
import { requireArea } from "@/lib/access";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireArea("teach");
  return (
    <Shell area="teach" user={{ name: user.name }} roles={user.areas}>
      {children}
    </Shell>
  );
}
