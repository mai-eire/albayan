"use client";

import { Button } from "@mantine/core";
import { IconArrowsExchange } from "@tabler/icons-react";
import { useState } from "react";
import { MoveStudentModal, type ClassChoice } from "@/app/admin/academics/classes/MoveStudentModal";
import type { FamilyMember } from "@/lib/db/queries/families";

type Props = {
  student: { enrolmentId: number; firstName: string };
  current: ClassChoice;
  options: ClassChoice[];
  family: FamilyMember[];
};

// The same move as from a class roster, started from the student's page.
export function MoveClassButton({ student, current, options, family }: Props) {
  const [open, setOpen] = useState(false);
  if (options.length === 0) return null;
  return (
    <>
      <Button
        variant="subtle"
        size="xs"
        leftSection={<IconArrowsExchange size={14} stroke={1.75} />}
        onClick={() => setOpen(true)}
      >
        Move class
      </Button>
      <MoveStudentModal
        student={open ? student : null}
        current={current}
        options={options}
        family={family}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
