"use client";

import { Button, PasswordInput, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { authClient } from "@/lib/auth-client";
import { validateNewPassword } from "../password";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const form = useForm({
    initialValues: { password: "", confirm: "" },
    validate: validateNewPassword,
  });

  const submit = form.onSubmit(async ({ password }) => {
    setLoading(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setLoading(false);
    if (error) {
      setError("This link has expired. Request a new one and try again.");
      return;
    }
    router.push("/login");
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
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
