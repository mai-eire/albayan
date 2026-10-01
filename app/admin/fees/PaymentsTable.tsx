"use client";

import { Button, Menu, Table, Text } from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppLink } from "@/components/AppLink";
import { Nothing } from "@/components/Nothing";
import { confirmDestructive } from "@/components/confirm";
import { MoneyText } from "@/components/MoneyText";
import { toast } from "@/components/toast";
import type { PaymentRow, PaymentTarget } from "@/lib/db/queries/fees";
import { methodLabels } from "@/lib/fees";
import { formatEuros } from "@/lib/money";
import { formatDate as formatDateIn } from "@/lib/time";
import { deletePayment } from "./actions";
import { PaymentModal } from "./PaymentModal";

type Props = {
  payments: PaymentRow[];
  // Shown when the table spans several children (a family's payments).
  showChild?: boolean;
  // Edit and delete are offered only where the child's guardians are known.
  target?: PaymentTarget;
  today: string;
  timezone: string;
};

// Payment history (§4.5). Each row can be corrected or deleted by admin, both audited.
export function PaymentsTable({ payments, showChild, target, today, timezone }: Props) {
  const router = useRouter();
  const formatDate = (date: string) => formatDateIn(date, timezone, true);
  const [editing, setEditing] = useState<PaymentRow | null>(null);

  const remove = (p: PaymentRow) =>
    confirmDestructive({
      title: "Delete this payment?",
      message: `This deletes the payment of ${formatEuros(p.amountCents)} recorded on ${formatDate(p.paidOn)}. This cannot be undone.`,
      confirmLabel: "Delete payment",
      onConfirm: async () => {
        const result = await deletePayment({ id: p.id });
        if (result.ok) {
          toast.success("Payment deleted");
          router.refresh();
        } else toast.error(result.error);
      },
    });

  return (
    <>
      <Table.ScrollContainer minWidth={0} type="native">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Paid on</Table.Th>
              {showChild && <Table.Th>Child</Table.Th>}
              <Table.Th ta="end">Amount</Table.Th>
              <Table.Th>How</Table.Th>
              <Table.Th>Paid by</Table.Th>
              <Table.Th>Reference</Table.Th>
              {target && <Table.Th />}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {payments.map((p) => (
              <Table.Tr key={p.id}>
                <Table.Td>{formatDate(p.paidOn)}</Table.Td>
                {showChild && (
                  <Table.Td>
                    <AppLink href={`/admin/students/${p.studentId}/fees`} fw={500}>
                      {p.studentName}
                    </AppLink>
                  </Table.Td>
                )}
                <Table.Td ta="end">
                  <MoneyText cents={p.amountCents} fw={500} />
                </Table.Td>
                <Table.Td>{methodLabels[p.method]}</Table.Td>
                <Table.Td>{p.paidByName ?? <Nothing>not recorded</Nothing>}</Table.Td>
                <Table.Td>
                  {p.reference ?? <Nothing>none</Nothing>}
                  {p.note && (
                    <Text size="sm" c="dimmed">
                      {p.note}
                    </Text>
                  )}
                </Table.Td>
                {target && (
                  <Table.Td ta="end">
                    <Menu shadow="md" position="bottom-end">
                      <Menu.Target>
                        <Button
                          variant="subtle"
                          color="gray"
                          size="xs"
                          aria-label={`Actions for the payment on ${formatDate(p.paidOn)}`}
                        >
                          <IconDots size={16} stroke={1.75} />
                        </Button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item onClick={() => setEditing(p)}>Edit payment</Menu.Item>
                        <Menu.Item color="clay" onClick={() => remove(p)}>
                          Delete payment
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {target && editing && (
        <PaymentModal
          key={editing.id}
          opened
          onClose={() => setEditing(null)}
          targets={[target]}
          existing={editing}
          today={today}
        />
      )}
    </>
  );
}
