"use client";

import { Button, PasswordInput, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { authClient } from "@/lib/auth-client";

const failed = "We couldn't sign you in — check your details and try again.";

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const form = useForm({
    initialValues: { identifier: "", password: "" },
    validate: {
      identifier: (v) => (v.trim() ? null : "Enter your email or student ID"),
      password: (v) => (v ? null : "Enter your password"),
    },
  });

  const submit = form.onSubmit(async ({ identifier, password }) => {
    setLoading(true);
    setError(null);
    const id = identifier.trim();
    const { data, error } = id.includes("@")
      ? await authClient.signIn.email({ email: id, password })
      : await authClient.signIn.username({ username: id, password });
    if (error || !data) {
      setError(failed);
      setLoading(false);
      return;
    }
    router.push(data.user.mustChangePassword ? "/change-password" : (next ?? "/"));
    router.refresh();
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <TextInput
          label="Email or student ID"
          placeholder="you@example.com or ALB-26-0042"
          autoComplete="username"
          {...form.getInputProps("identifier")}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          {...form.getInputProps("password")}
        />
        <FormError message={error} />
        <Button type="submit" loading={loading} fullWidth>
          Sign in
        </Button>
      </Stack>
    </form>
  );
}
