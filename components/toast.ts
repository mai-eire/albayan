import { notifications } from "@mantine/notifications";

// Toasts confirm in the past tense (§4.9, §7): "Register submitted", "Payment recorded".
export const toast = {
  success: (message: string) => notifications.show({ message, color: "tile" }),
  error: (message: string) => notifications.show({ message, color: "clay" }),
  warning: (message: string) => notifications.show({ message, color: "saffron" }),
};
