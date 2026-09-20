"use client";

import { Button, Menu, Modal, Table, Text } from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { confirmDestructive } from "@/components/confirm";
import { StatusBadge } from "@/components/StatusBadge";
import { SubjectBadge } from "@/components/SubjectBadge";
import { toast } from "@/components/toast";
import type { HomeworkRow, HomeworkTarget } from "@/lib/db/queries/homework";
import { dueLabel, homeworkStatus } from "@/lib/homework";
import { deleteHomework, setHomeworkPublished } from "./actions";
import { HomeworkForm, type Attachment } from "./HomeworkForm";

export function HomeworkTable({
  rows,
  targets,
  attachments,
  today,
  timezone,
}: {
  rows: HomeworkRow[];
  targets: HomeworkTarget[];
  // Each homework's files and links, keyed by homework id, for the edit form.
  attachments: Record<number, Attachment[]>;
  today: string;
  timezone: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<HomeworkRow | null>(null);

  const setPublished = async (row: HomeworkRow, published: boolean) => {
    const result = await setHomeworkPublished({ id: row.id, published });
    if (result.ok) {
      toast.success(published ? "Homework published" : "Back to a draft");
      router.refresh();
    } else toast.error(result.error);
  };

  const remove = (row: HomeworkRow) =>
    confirmDestructive({
      title: "Delete this homework?",
      message: row.publishedAt
        ? `Families can already see "${row.title}". Deleting removes it for them too.`
        : `This deletes the draft "${row.title}".`,
      confirmLabel: "Delete homework",
      onConfirm: async () => {
        const result = await deleteHomework({ id: row.id });
        if (result.ok) {
          toast.success("Homework deleted");
          router.refresh();
        } else toast.error(result.error);
      },
    });

  return (
    <>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Homework</Table.Th>
            <Table.Th>Class</Table.Th>
            <Table.Th>Due</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => (
            <Table.Tr key={row.id}>
              <Table.Td>
                <Text fw={500}>{row.title}</Text>
              </Table.Td>
              <Table.Td>
                {row.className} <SubjectBadge subjectId={row.subjectId} name={row.subjectName} />
              </Table.Td>
              <Table.Td>
                <StatusBadge domain="homework" value={homeworkStatus(row.dueDate, today)} />
                <Text size="sm" c="dimmed">
                  {dueLabel(row.dueDate, today, timezone)}
                </Text>
              </Table.Td>
              <Table.Td>
                <StatusBadge domain="publication" value={row.publishedAt ? "published" : "draft"} />
              </Table.Td>
              <Table.Td ta="end">
                <Menu shadow="md" position="bottom-end">
                  <Menu.Target>
                    <Button
                      variant="subtle"
                      color="gray"
                      size="xs"
                      aria-label={`Actions for ${row.title}`}
                    >
                      <IconDots size={16} stroke={1.75} />
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item onClick={() => setEditing(row)}>Edit</Menu.Item>
                    {row.publishedAt ? (
                      <Menu.Item onClick={() => setPublished(row, false)}>Unpublish</Menu.Item>
                    ) : (
                      <Menu.Item onClick={() => setPublished(row, true)}>Publish</Menu.Item>
                    )}
                    <Menu.Item color="clay" onClick={() => remove(row)}>
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit homework"
        size="lg"
      >
        {editing && (
          <HomeworkForm
            targets={targets}
            existing={editing}
            attachments={attachments[editing.id] ?? []}
            today={today}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </>
  );
}
