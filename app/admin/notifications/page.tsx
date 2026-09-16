import { NotificationsPage } from "@/components/NotificationsPage";
import { requireArea } from "@/lib/access";

export const metadata = { title: "Notifications" };

export default async function Page() {
  const user = await requireArea("admin");
  return <NotificationsPage userId={user.id} />;
}
