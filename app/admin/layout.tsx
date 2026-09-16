import { Shell } from "@/components/Shell";
import { requireArea } from "@/lib/access";
import { db } from "@/lib/db";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { countUnread } from "@/lib/notify";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [user, { name }] = await Promise.all([requireArea("admin"), getSchoolSettings()]);
  const unread = await countUnread(await db(), user.id);
  return (
    <Shell
      area="admin"
      schoolName={name}
      user={{ name: user.name }}
      roles={user.areas}
      unread={unread}
    >
      {children}
    </Shell>
  );
}
