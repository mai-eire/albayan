"use client";

import { Button, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const form = useForm({
    initialValues: { email: "" },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? null : "Enter your email address"),
    },
  });

  const submit = form.onSubmit(async ({ email }) => {
    setLoading(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: "/reset-password",
    });
    setLoading(false);
    if (error) {
      setError("We couldn't send the email — check your connection and try again.");
      return;
    }
    setSent(true);
  });

  if (sent) {
    return (
      <Text>
        If that address has an account, we&apos;ve emailed a link to choose a new password. It works
        for one hour.
      </Text>
    );
  }

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Enter the email address on your account and we&apos;ll send you a link.
        </Text>
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          {...form.getInputProps("email")}
        />
        <FormError message={error} />
        <Button type="submit" loading={loading} fullWidth>
          Email me a link
        </Button>
      </Stack>
    </form>
  );
}
