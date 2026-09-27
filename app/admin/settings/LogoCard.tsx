"use client";

import { Button, Card, FileInput, Group, Stack, Text } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CardTitle } from "@/components/CardTitle";
import { confirmDestructive } from "@/components/confirm";
import { FormError } from "@/components/FormError";
import { SchoolMark } from "@/components/SchoolMark";
import { toast } from "@/components/toast";
import { uploadFile } from "@/components/uploadFile";
import { logoTypes, maxLogoBytes } from "@/lib/logo";
import { updateSchoolLogo } from "./actions";

// Its own card and its own save, because a logo arrives as an upload rather than a form
// field: choose the file, it goes up, the key is recorded. The preview is the same
// component the header uses, so what you see here is what everyone else gets.
export function LogoCard({ logo }: { logo: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = async (file: File | null) => {
    if (!file) return;
    setError(null);
    if (!logoTypes.includes(file.type)) {
      setError("Use a PNG, JPEG, WebP or SVG image.");
      return;
    }
    if (file.size > maxLogoBytes) {
      setError("Logos can be up to 2 MB.");
      return;
    }
    setBusy(true);
    const uploaded = await uploadFile(file);
    if (!uploaded.ok) {
      setBusy(false);
      setError(uploaded.error);
      return;
    }
    const result = await updateSchoolLogo({ storageKey: uploaded.file.storageKey });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Logo saved");
    router.refresh();
  };

  const remove = () =>
    confirmDestructive({
      title: "Remove the logo?",
      message: "The school mark goes back to the app's own icon everywhere, including sign-in.",
      confirmLabel: "Remove logo",
      onConfirm: async () => {
        const result = await updateSchoolLogo({ storageKey: null });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Logo removed");
        router.refresh();
      },
    });

  return (
    <Card>
      <CardTitle
        context={
          logo && (
            <Button variant="subtle" color="clay" size="xs" onClick={remove}>
              Remove
            </Button>
          )
        }
      >
        Logo
      </CardTitle>
      <Stack gap="md">
        <Group gap="md" align="center">
          <SchoolMark logo={logo} size={48} />
          <Text size="sm" c="dimmed">
            {logo
              ? "Shown on the sign-in page and in the header."
              : "No logo yet — the app's school mark is used. Upload one and it replaces it on the sign-in page and in the header."}
          </Text>
        </Group>
        <FileInput
          label={logo ? "Replace the logo" : "Upload a logo"}
          description="PNG, JPEG, WebP or SVG, up to 2 MB. A square-ish mark sits best beside the name. It saves as soon as you choose it."
          accept={logoTypes.join(",")}
          leftSection={<IconUpload size={16} stroke={1.75} />}
          disabled={busy}
          value={null}
          placeholder="Choose an image"
          onChange={choose}
          maw={420}
        />
        <FormError message={error} />
      </Stack>
    </Card>
  );
}
