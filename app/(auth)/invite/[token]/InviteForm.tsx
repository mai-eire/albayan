"use client";

import { Button, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { acceptInviteAction } from "../../actions";
import { validateNewPassword } from "../../password";

export function InviteForm({ token, email }: { token: string; email: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const form = useForm({
    initialValues: { password: "", confirm: "" },
    validate: validateNewPassword,
  });

  const submit = form.onSubmit(async ({ password }) => {
    setLoading(true);
    setError(null);
    const result = await acceptInviteAction(token, password);
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
    }
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Choose a password to finish setting up your account.
        </Text>
        <TextInput label="Email" value={email} readOnly />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          {...form.getInputProps("password")}
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          {...form.getInputProps("confirm")}
        />
        <FormError message={error} />
        <Button type="submit" loading={loading} fullWidth>
          Create my account
        </Button>
      </Stack>
    </form>
  );
}
