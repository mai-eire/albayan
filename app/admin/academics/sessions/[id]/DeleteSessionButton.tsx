"use client";

import { Button } from "@mantine/core";
import { useRouter } from "next/navigation";
import { confirmDestructive } from "@/components/confirm";
import { toast } from "@/components/toast";
import { deleteSession } from "../actions";

export function DeleteSessionButton({
  id,
  name,
  classCount,
}: {
  id: number;
  name: string;
  classCount: number;
}) {
  const router = useRouter();
  if (classCount > 0) return null;
  return (
    <Button
      variant="light"
      color="clay"
      onClick={() =>
        confirmDestructive({
          title: "Delete this session?",
          message: `This removes ${name} and its schedule. This cannot be undone.`,
          confirmLabel: "Delete session",
          onConfirm: async () => {
            const result = await deleteSession({ id });
            if (result.ok) {
              toast.success("Session deleted");
              router.push("/admin/academics/sessions");
            } else toast.error(result.error);
          },
        })
      }
    >
      Delete session
    </Button>
  );
}
