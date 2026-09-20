"use client";

import {
  ActionIcon,
  Button,
  Group,
  Popover,
  PopoverDropdown,
  PopoverTarget,
  Stack,
  Text,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconClockEdit } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { DateField } from "./DateField";
import { DirectionalIcon } from "./DirectionalIcon";
import { devClockCookie } from "@/lib/dev-clock";

function readCookie(): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${devClockCookie}=(\\d{4}-\\d{2}-\\d{2})`),
  );
  return match?.[1] ?? null;
}

const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function shift(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function write(value: string | null) {
  document.cookie = value
    ? `${devClockCookie}=${value}; path=/; samesite=lax`
    : `${devClockCookie}=; path=/; max-age=0`;
  for (const l of listeners) l();
}

// Development only: pick the date the app should think it is (lib/clock.ts reads the
// cookie on the server). Saffron so nobody mistakes it for a feature.
export function DevClock() {
  const router = useRouter();
  const value = useSyncExternalStore(subscribe, readCookie, () => null);
  const set = (next: string | null) => {
    write(next);
    router.refresh();
  };
  // Stepping from the real date starts at today.
  const current = value ?? new Date().toISOString().slice(0, 10);
  return (
    <Popover position="bottom" shadow="md" withArrow>
      <PopoverTarget>
        <Button
          variant={value ? "light" : "subtle"}
          color="saffron"
          size="xs"
          leftSection={<IconClockEdit size={14} stroke={1.75} />}
          aria-label="Dev clock"
        >
          {value ?? "Dev clock"}
        </Button>
      </PopoverTarget>
      <PopoverDropdown>
        <Stack gap="sm" w={260}>
          <Text size="sm">See the app as on another day.</Text>
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Previous day"
              onClick={() => set(shift(current, -1))}
            >
              <DirectionalIcon icon={IconChevronLeft} size={16} />
            </ActionIcon>
            <DateField
              aria-label="Pretend today is"
              value={value}
              onChange={(v) => set(v ? String(v).slice(0, 10) : null)}
              clearable
              style={{ flex: 1 }}
            />
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Next day"
              onClick={() => set(shift(current, 1))}
            >
              <DirectionalIcon icon={IconChevronRight} size={16} />
            </ActionIcon>
          </Group>
          <Group justify="flex-end">
            <Button variant="default" size="xs" onClick={() => set(null)} disabled={!value}>
              Back to the real date
            </Button>
          </Group>
        </Stack>
      </PopoverDropdown>
    </Popover>
  );
}
