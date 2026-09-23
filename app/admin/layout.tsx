import { Shell } from "@/components/Shell";
import { requireArea } from "@/lib/access";
import { db } from "@/lib/db";
import { countPendingApplications } from "@/lib/db/queries/admin";
import { listUnreadNotifications } from "@/lib/db/queries/notifications";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { countUnread } from "@/lib/notify";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [user, { name }] = await Promise.all([requireArea("admin"), getSchoolSettings()]);
  const [unread, recent, applications] = await Promise.all([
    countUnread(await db(), user.id),
    listUnreadNotifications(user.id),
    countPendingApplications(),
  ]);
  return (
    <Shell
      area="admin"
      schoolName={name}
      user={{ name: user.name }}
      roles={user.areas}
      unread={unread}
      recent={recent}
      counts={{ "/admin/applications": applications }}
    >
      {children}
    </Shell>
  );
}
