"use client";

import { Button, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { validateNewPassword } from "../password";
import { registerGuardian, type RegisterInput } from "./actions";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const form = useForm<RegisterInput & { confirm: string }>({
    initialValues: { name: "", email: "", phone: "", password: "", confirm: "" },
    validate: validateNewPassword,
  });

  const submit = form.onSubmit(async ({ name, email, phone, password }) => {
    setLoading(true);
    setError(null);
    const result = await registerGuardian({ name, email, phone, password });
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      setLoading(false);
    }
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          For parents and guardians. You&apos;ll register your children once you&apos;re in.
        </Text>
        <TextInput
          label="Your name"
          autoComplete="name"
          withAsterisk
          {...form.getInputProps("name")}
        />
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          withAsterisk
          {...form.getInputProps("email")}
        />
        <TextInput
          label="Phone"
          type="tel"
          autoComplete="tel"
          withAsterisk
          {...form.getInputProps("phone")}
        />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          description="At least 8 characters"
          withAsterisk
          {...form.getInputProps("password")}
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          withAsterisk
          {...form.getInputProps("confirm")}
        />
        <FormError message={error} />
        <Button type="submit" loading={loading} fullWidth>
          Create account
        </Button>
      </Stack>
    </form>
  );
}
