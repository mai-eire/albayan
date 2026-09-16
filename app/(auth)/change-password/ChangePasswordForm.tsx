"use client";

import { Button, PasswordInput, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { changePasswordAction } from "../actions";
import { validateNewPassword } from "../password";

export function ChangePasswordForm({ required }: { required: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const form = useForm({
    initialValues: { current: "", password: "", confirm: "" },
    validate: {
      current: (v) => (v ? null : "Enter your current password"),
      ...validateNewPassword,
    },
  });

  const submit = form.onSubmit(async ({ current, password }) => {
    setLoading(true);
    setError(null);
    const result = await changePasswordAction(current, password);
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
    }
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        {required && (
          <Text size="sm" c="dimmed">
            You&apos;re using a temporary password. Choose your own to continue.
          </Text>
        )}
        <PasswordInput
          label="Current password"
          autoComplete="current-password"
          {...form.getInputProps("current")}
        />
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          {...form.getInputProps("password")}
        />
        <PasswordInput
          label="Confirm new password"
          autoComplete="new-password"
          {...form.getInputProps("confirm")}
        />
        <FormError message={error} />
        <Button type="submit" loading={loading} fullWidth>
          Save new password
        </Button>
      </Stack>
    </form>
  );
}
