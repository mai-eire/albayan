"use client";

import { Button } from "@mantine/core";
import { useRouter } from "next/navigation";
import { confirmDestructive } from "@/components/confirm";
import { toast } from "@/components/toast";
import { deleteClass } from "../actions";

export function DeleteClassButton({
  id,
  name,
  studentCount,
}: {
  id: number;
  name: string;
  studentCount: number;
}) {
  const router = useRouter();
  if (studentCount > 0) return null;
  return (
    <Button
      variant="light"
      color="clay"
      onClick={() =>
        confirmDestructive({
          title: "Delete this class?",
          message: `This removes ${name} and its teacher assignments. This cannot be undone.`,
          confirmLabel: "Delete class",
          onConfirm: async () => {
            const result = await deleteClass({ id });
            if (result.ok) {
              toast.success("Class deleted");
              router.push("/admin/academics/classes");
            } else toast.error(result.error);
          },
        })
      }
    >
      Delete class
    </Button>
  );
}
