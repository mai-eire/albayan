"use client";

import { Button, Card } from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { CardTitle } from "./CardTitle";

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
