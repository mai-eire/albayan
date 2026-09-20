"use client";

import { Button, Modal, Select, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { ResourceForm } from "@/components/ResourceForm";
import type { TeacherClassRow } from "@/lib/db/queries/teach";

// Pick the class first, then the usual form.
export function ShareWithClassButton({ classes }: { classes: TeacherClassRow[] }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [classId, setClassId] = useState<number>(classes[0].id);
  return (
    <>
      <Button leftSection={<IconPlus size={16} stroke={1.75} />} onClick={open}>
        Share with a class
      </Button>
      <Modal opened={opened} onClose={close} title="Share with a class">
        <Stack gap="md">
          <Select
            label="Class"
            data={classes.map((c) => ({
              value: String(c.id),
              label: `${c.name} · ${c.sessionName}`,
            }))}
            value={String(classId)}
            onChange={(v) => v && setClassId(Number(v))}
            allowDeselect={false}
          />
          <ResourceForm target={{ kind: "class", classId, subjectId: null }} onDone={close} />
        </Stack>
      </Modal>
    </>
  );
}
