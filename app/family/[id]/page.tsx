import { Card, Text } from "@mantine/core";
import { EntityList } from "@/components/EntityList";
import { MoneyText } from "@/components/MoneyText";
import { StatusBadge } from "@/components/StatusBadge";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate, nextDateOn, relativeDay, todayIn } from "@/lib/time";
import { loadChild } from "./load";

type Props = { params: Promise<{ id: string }> };

// "What's next" for one child (§5): a short list, each row linking to its tab.
export default async function ChildOverviewPage({ params }: Props) {
  const [child, { timezone }] = await Promise.all([loadChild(params), getSchoolSettings()]);
  const today = todayIn(timezone);
  const items = [];
  if (child.place) {
    const next = nextDateOn(child.place.dayOfWeek, today);
    items.push({
      key: "lesson",
      title: `Next class ${relativeDay(next, today, timezone, true)}`,
      detail: `${formatDate(next, timezone)} · ${child.place.startTime}${child.place.room ? ` · ${child.place.room}` : ""} · ${child.place.className}`,
      href: `/family/${child.id}/timetable`,
    });
  } else if (child.status === "applied") {
    items.push({
      key: "application",
      title: "Application received",
      detail: child.preferredSessionName
        ? `You asked for ${child.preferredSessionName}. We'll email you once a place is confirmed.`
        : "We'll email you once a place is confirmed.",
      badge: <StatusBadge domain="application" value="applied" />,
    });
  } else if (child.status === "declined") {
    items.push({
      key: "declined",
      title: "No place this time",
      detail: child.declinedReason ?? "Contact the school office if you have questions.",
      badge: <StatusBadge domain="application" value="declined" />,
    });
  }
  if (child.fee) {
    items.push({
      key: "fee",
      title: "Fee for the year",
      detail: child.fee.note ?? "Paying is handled by the school office for now.",
      badge: <MoneyText cents={child.fee.cents} fw={600} />,
    });
  }
  return (
    <Card>
      {items.length ? <EntityList items={items} /> : <Text c="dimmed">Nothing to show yet.</Text>}
    </Card>
  );
}
