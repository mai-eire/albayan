"use client";

import { Button, Modal } from "@mantine/core";
import { IconUserPlus } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { AddParentForm } from "@/app/family/parents/AddParentForm";
import { addGuardianToStudent } from "@/app/admin/guardians/[id]/actions";

export function AddGuardianButton({ student }: { student: { id: number; firstName: string } }) {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button variant="light" leftSection={<IconUserPlus size={16} stroke={1.75} />} onClick={open}>
        Add guardian
      </Button>
      <Modal
        opened={opened}
        onClose={close}
        title={`Add a guardian for ${student.firstName}`}
        size="lg"
      >
        <AddParentForm kids={[student]} submit={addGuardianToStudent} onDone={close} />
      </Modal>
    </>
  );
}
