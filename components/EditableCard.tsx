"use client";

import { Button, Card, Group } from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { CardTitle } from "./CardTitle";
import { FormError } from "./FormError";
import { toast } from "./toast";

const DoneContext = createContext<(() => void) | null>(null);

// Inside an EditableCard's form: call after a successful save (or on cancel) to close it.
// Outside one it is null, so forms that always show stay as they are.
export function useEditingDone() {
  return useContext(DoneContext);
}

type Props = {
  title: ReactNode;
  // The read-only rendering (Fields in a grid); a Server Component can build it.
  view: ReactNode;
  // The form, shown in place of the view while editing.
  children: ReactNode;
  // Shown beside the title in both states, before the Edit button.
  context?: ReactNode;
};

// Profile cards show their data and offer one Edit button (§4.3); the form replaces the
// view until it is saved or cancelled.
export function EditableCard({ title, view, children, context }: Props) {
  const [editing, setEditing] = useState(false);
  return (
    <Card>
      <CardTitle
        context={
          <>
            {context}
            {!editing && (
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconPencil size={14} stroke={1.75} />}
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
            )}
          </>
        }
      >
        {title}
      </CardTitle>
      {editing ? (
        <DoneContext.Provider value={() => setEditing(false)}>{children}</DoneContext.Provider>
      ) : (
        view
      )}
    </Card>
  );
}

type Result =
  { ok: true; data: unknown } | { ok: false; error: string; fieldErrors?: Record<string, string> };

// Every editable card saves the same way: submit, show field errors or a toast, refresh,
// and close the card it sits in.
export function useSave<V extends Record<string, unknown>>(
  initial: V,
  save: (values: V) => Promise<Result>,
  done: string,
) {
  const router = useRouter();
  const close = useEditingDone();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<V>({ initialValues: initial, onValuesChange: () => setError(null) });
  const submit = form.onSubmit(async (values) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const result = await save(values);
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(done);
    form.resetDirty(values);
    router.refresh();
    close?.();
  });
  return { form, submit, error, saving, close };
}

export function SaveRow({
  saving,
  dirty,
  error,
  close,
}: {
  saving: boolean;
  dirty: boolean;
  error: string | null;
  close: (() => void) | null;
}) {
  return (
    <>
      <FormError message={error} />
      <Group justify="flex-end">
        {close && (
          <Button variant="default" onClick={close}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={saving} disabled={!dirty}>
          Save changes
        </Button>
      </Group>
    </>
  );
}
