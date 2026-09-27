import { Shell } from "@/components/Shell";
import { requireArea } from "@/lib/access";
import { db } from "@/lib/db";
import { listUnreadNotifications } from "@/lib/db/queries/notifications";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { logoUrl } from "@/lib/logo";
import { countUnread } from "@/lib/notify";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [user, { name, logoKey }] = await Promise.all([
    requireArea("student"),
    getSchoolSettings(),
  ]);
  const [unread, recent] = await Promise.all([
    countUnread(await db(), user.id),
    listUnreadNotifications(user.id),
  ]);
  return (
    <Shell
      area="student"
      schoolName={name}
      logo={logoUrl(logoKey)}
      user={{ name: user.name }}
      roles={user.areas}
      unread={unread}
      recent={recent}
    >
      {children}
    </Shell>
  );
}
