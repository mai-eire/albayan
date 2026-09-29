"use client";

import {
  IconBallFootball,
  IconBeach,
  IconBriefcase,
  IconBus,
  IconCalendar,
  IconClipboardText,
  IconConfetti,
  IconLock,
  IconSun,
  IconTent,
  IconUsers,
  IconUsersGroup,
  type Icon,
} from "@tabler/icons-react";
import { eventLook } from "@/lib/events";
import type { EventType } from "@/lib/db/schema";

// The icon for each kind of entry (DESIGN §4.10). Kept here rather than in lib/events.ts
// so the pure module stays free of React.
const icons: Record<string, Icon> = {
  holiday: IconBeach,
  closure: IconLock,
  exam: IconClipboardText,
  meeting: IconUsers,
  staff: IconBriefcase,
  other: IconCalendar,
  trip: IconBus,
  camp: IconTent,
  summer_school: IconSun,
  club: IconUsersGroup,
  sports_day: IconBallFootball,
  community: IconConfetti,
};

export function EventIcon({ type, size = 14 }: { type: EventType; size?: number }) {
  const Component = icons[eventLook(type).icon] ?? IconCalendar;
  return <Component size={size} stroke={1.75} />;
}
