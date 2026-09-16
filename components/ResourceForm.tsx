"use client";

import {
  Button,
  FileInput,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconUpload } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import { resourceAudiences, type ResourceAudience } from "@/lib/db/schema";
import { createResource, type ResourceTarget } from "@/lib/resources";

const audienceLabels: Record<ResourceAudience, string> = {
  students_and_guardians: "Students and families",
  guardians_only: "Families only",
  staff_only: "Staff only",
};

// Share a file (uploaded through /api/files first) or a link with one target. The target
// is decided by the page that opens the form; the person picks title, audience and content.
export function ResourceForm({
  target,
  onDone,
  defaultAudience = "students_and_guardians",
}: {
  target: ResourceTarget;
  onDone: () => void;
  defaultAudience?: ResourceAudience;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm({
    initialValues: {
      kind: "file" as "file" | "link",
      title: "",
      description: "",
      audience: defaultAudience,
      file: null as File | null,
      url: "",
    },
    validate: {
      file: (v, values) => (values.kind === "file" && !v ? "Choose a file" : null),
      url: (v, values) => (values.kind === "link" && !v.trim() ? "Enter a link" : null),
    },
  });

  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    let file: { storageKey: string; mimeType: string; sizeBytes: number } | null = null;
    if (values.kind === "file" && values.file) {
      const response = await fetch("/api/files", {
        method: "POST",
        headers: {
          "Content-Type": values.file.type || "application/octet-stream",
          "X-File-Name": values.file.name,
        },
        body: values.file,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(
          body?.error ?? "We couldn't upload the file — check your connection and try again.",
        );
        setSaving(false);
        return;
      }
      const uploaded = (await response.json()) as {
        key: string;
        size: number;
        contentType: string;
      };
      file = { storageKey: uploaded.key, mimeType: uploaded.contentType, sizeBytes: uploaded.size };
    }
    const result = await createResource({
      title: values.title || values.file?.name || "",
      description: values.description,
      audience: values.audience,
      target,
      file,
      url: values.kind === "link" ? values.url : null,
    });
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success("Shared");
    onDone();
    router.refresh();
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <SegmentedControl
          data={[
            { value: "file", label: "File" },
            { value: "link", label: "Link" },
          ]}
          {...form.getInputProps("kind")}
        />
        {form.values.kind === "file" ? (
          <FileInput
            label="File"
            description="Up to 25 MB"
            leftSection={<IconUpload size={16} stroke={1.75} />}
            withAsterisk
            clearable
            {...form.getInputProps("file")}
          />
        ) : (
          <TextInput
            label="Link"
            placeholder="https://"
            type="url"
            withAsterisk
            {...form.getInputProps("url")}
          />
        )}
        <TextInput
          label="Title"
          description={form.values.kind === "file" ? "Leave blank to use the file name" : undefined}
          {...form.getInputProps("title")}
        />
        <Textarea label="Description" autosize minRows={2} {...form.getInputProps("description")} />
        {target.kind !== "student" && (
          <Select
            label="Who can see it"
            data={resourceAudiences.map((a) => ({ value: a, label: audienceLabels[a] }))}
            allowDeselect={false}
            {...form.getInputProps("audience")}
          />
        )}
        <FormError message={error} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Share
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function ShareResourceButton({
  target,
  label = "Share a resource",
  variant,
  size,
}: {
  target: ResourceTarget;
  label?: string;
  variant?: string;
  size?: string;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button
        leftSection={<IconPlus size={16} stroke={1.75} />}
        onClick={open}
        variant={variant}
        size={size}
      >
        {label}
      </Button>
      <Modal opened={opened} onClose={close} title={label}>
        <ResourceForm target={target} onDone={close} />
      </Modal>
    </>
  );
}
