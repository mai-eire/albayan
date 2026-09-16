import { modals } from "@mantine/modals";

// Destructive confirmations (§4.8): the consequence in the body, a clay confirm button.
export function confirmDestructive(opts: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}) {
  modals.openConfirmModal({
    title: opts.title,
    children: opts.message,
    labels: { confirm: opts.confirmLabel, cancel: "Cancel" },
    confirmProps: { color: "clay" },
    onConfirm: opts.onConfirm,
  });
}
