import { Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

// Server-side failure shown inline above the form's button (§3.5, §4.9).
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert color="clay" variant="light" icon={<IconAlertCircle size={16} stroke={1.75} />}>
      {message}
    </Alert>
  );
}
