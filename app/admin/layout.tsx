import { Shell } from "@/components/Shell";
import { requireArea } from "@/lib/access";
import { db } from "@/lib/db";
import { countPendingApplications } from "@/lib/db/queries/admin";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { countUnread } from "@/lib/notify";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [user, { name }] = await Promise.all([requireArea("admin"), getSchoolSettings()]);
  const [unread, applications] = await Promise.all([
    countUnread(await db(), user.id),
    countPendingApplications(),
  ]);
  return (
    <Shell
      area="admin"
      schoolName={name}
      user={{ name: user.name }}
      roles={user.areas}
      unread={unread}
      counts={{ "/admin/applications": applications }}
    >
      {children}
    </Shell>
  );
}
