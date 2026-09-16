"use client";

import { Button, Checkbox, Group, Modal, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import { inviteStaff, type InviteInput } from "./actions";

export function InviteButton() {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button leftSection={<IconPlus size={16} stroke={1.75} />} onClick={open}>
        Invite
      </Button>
      <Modal opened={opened} onClose={close} title="Invite a teacher or admin">
        <InviteForm onDone={close} />
      </Modal>
    </>
  );
}

function InviteForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<InviteInput>({
    initialValues: { name: "", email: "", phone: "", teacher: true, admin: false },
  });

  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = await inviteStaff(values);
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    const { outcome, name } = result.data;
    toast.success(
      outcome === "invited"
        ? `Invite sent to ${values.email}`
        : outcome === "resent"
          ? `${name} already had an invite — sent again`
          : `${name} already has an account, so the role was added`,
    );
    onDone();
    router.refresh();
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <TextInput label="Name" withAsterisk data-autofocus {...form.getInputProps("name")} />
        <TextInput
          label="Email"
          type="email"
          withAsterisk
          description="They'll get a link to set their password"
          {...form.getInputProps("email")}
        />
        <TextInput label="Phone" {...form.getInputProps("phone")} />
        <Checkbox.Group
          label="Role"
          withAsterisk
          value={[form.values.teacher && "teacher", form.values.admin && "admin"].filter(
            (v): v is string => Boolean(v),
          )}
          onChange={(v) => {
            form.setFieldValue("teacher", v.includes("teacher"));
            form.setFieldValue("admin", v.includes("admin"));
          }}
          error={form.errors.teacher}
        >
          <Group mt="xs">
            <Checkbox value="teacher" label="Teacher" />
            <Checkbox value="admin" label="Admin" />
          </Group>
        </Checkbox.Group>
        <FormError message={error} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Send invite
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
