"use client";

import { Alert, Button, Group, Text } from "@mantine/core";
import { IconMailExclamation } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "@/components/toast";
import { resendVerification } from "@/app/(auth)/register/actions";

export function VerifyEmailNotice({ email }: { email: string }) {
  const [sending, setSending] = useState(false);
  const resend = async () => {
    setSending(true);
    const result = await resendVerification();
    setSending(false);
    if (result.ok) toast.success(`Email sent to ${email}`);
    else toast.error(result.error);
  };
  return (
    <Alert color="saffron" variant="light" icon={<IconMailExclamation size={16} stroke={1.75} />}>
      <Group justify="space-between" gap="sm">
        <Text size="sm">
          We&apos;ve sent a link to {email}. Confirm your email to register your children.
        </Text>
        <Button variant="light" color="saffron" size="xs" loading={sending} onClick={resend}>
          Send it again
        </Button>
      </Group>
    </Alert>
  );
}
