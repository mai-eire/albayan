"use client";

import { Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import type { PaymentTarget } from "@/lib/db/queries/fees";
import { PaymentModal } from "./PaymentModal";

// The page's primary action: opens the payment form for one child or with a child picker.
export function RecordPaymentButton({
  targets,
  today,
  size,
}: {
  targets: PaymentTarget[];
  today: string;
  // "xs" inside a card title; the default on a page header.
  size?: string;
}) {
  const [opened, setOpened] = useState(false);
  if (targets.length === 0) return null;
  return (
    <>
      <Button
        leftSection={<IconPlus size={16} stroke={1.75} />}
        size={size}
        onClick={() => setOpened(true)}
      >
        Record payment
      </Button>
      {opened && (
        <PaymentModal opened onClose={() => setOpened(false)} targets={targets} today={today} />
      )}
    </>
  );
}
