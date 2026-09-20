"use client";

import { Button, Card, Group, Text } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/FormError";
import { toast } from "@/components/toast";
import { rulesExtensions } from "@/lib/rules";
import { updateSchoolRules } from "./actions";

// The rules as the office writes them (§4.7 rich text): headings, bold, italic, lists and
// links — the same set the server keeps, so pasting from a document keeps its shape.
export function RulesEditor({ rules }: { rules: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const editor = useEditor({
    extensions: rulesExtensions,
    content: rules,
    immediatelyRender: false,
    onUpdate: () => {
      setDirty(true);
      setError(null);
    },
  });

  const save = async () => {
    if (!editor || saving) return;
    setSaving(true);
    setError(null);
    const result = await updateSchoolRules({ rules: editor.getHTML() });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Rules saved");
    setDirty(false);
    router.refresh();
  };

  return (
    <Card>
      <RichTextEditor editor={editor} aria-label="School rules">
        <RichTextEditor.Toolbar sticky>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Link />
            <RichTextEditor.Unlink />
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>
        <RichTextEditor.Content mih={320} />
      </RichTextEditor>
      <FormError message={error} />
      <Group justify="space-between" mt="md">
        <Text size="sm" c="dimmed">
          Shown to families, students and staff as written. Pasting from a document keeps headings,
          lists and links.
        </Text>
        <Button onClick={save} loading={saving} disabled={!dirty}>
          Save rules
        </Button>
      </Group>
    </Card>
  );
}
