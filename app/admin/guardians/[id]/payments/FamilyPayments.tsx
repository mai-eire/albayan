"use client";

import { Card, Select, Stack, Table, Text } from "@mantine/core";
import { useState } from "react";
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import { Figures } from "@/components/Figures";
import { MoneyText } from "@/components/MoneyText";
import { StatusBadge } from "@/components/StatusBadge";
import type { FeeAccountRow, PaymentRow } from "@/lib/db/queries/fees";
import { formatEuros } from "@/lib/money";
import { PaymentsTable } from "@/app/admin/fees/PaymentsTable";

type Props = {
  year: string | null;
  accounts: FeeAccountRow[];
  payments: PaymentRow[];
  today: string;
  timezone: string;
};

// What the family owes this year, child by child, then every payment they've made.
export function FamilyPayments({ year, accounts, payments, today, timezone }: Props) {
  const [child, setChild] = useState<string | null>(null);
  const shown = child ? payments.filter((p) => String(p.studentId) === child) : payments;
  const children = [...new Map(payments.map((p) => [p.studentId, p.studentName]))].map(
    ([id, name]) => ({ value: String(id), label: name }),
  );
  const owed = accounts.reduce((s, a) => s + Math.max(0, a.balanceCents), 0);
  const fee = accounts.reduce((s, a) => s + a.feeCents, 0);
  const paid = accounts.reduce((s, a) => s + a.paidCents, 0);

  return (
    <Stack gap="lg">
      {year && accounts.length > 0 && (
        <Card>
          <CardTitle>Fees for {year}</CardTitle>
          <Figures
            items={[
              {
                label: "Outstanding",
                value: formatEuros(owed),
                color: owed ? "saffron" : undefined,
                hint: owed ? undefined : "Paid in full",
              },
              { label: "Fees", value: formatEuros(fee) },
              { label: "Paid", value: formatEuros(paid) },
            ]}
          />
          <Table mt="lg">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Child</Table.Th>
                <Table.Th>Class</Table.Th>
                <Table.Th ta="end">Fee</Table.Th>
                <Table.Th ta="end">Paid</Table.Th>
                <Table.Th ta="end">Balance</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {accounts.map(({ enrolment: e, ...a }) => (
                <Table.Tr key={e.studentId}>
                  <Table.Td>
                    <AppLink href={`/admin/students/${e.studentId}/fees`} fw={500}>
                      {e.firstName} {e.lastName}
                    </AppLink>
                  </Table.Td>
                  <Table.Td>
                    {e.className} · {e.sessionName}
                  </Table.Td>
                  <Table.Td ta="end">
                    <MoneyText cents={a.feeCents} />
                  </Table.Td>
                  <Table.Td ta="end">
                    <MoneyText cents={a.paidCents} />
                  </Table.Td>
                  <Table.Td ta="end">
                    <MoneyText cents={a.balanceCents} fw={500} />
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge domain="fee" value={a.status} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
      <Card>
        <CardTitle
          context={
            children.length > 1 && (
              <Select
                aria-label="Child"
                placeholder="All children"
                data={children}
                value={child}
                onChange={setChild}
                clearable
                size="xs"
                w={180}
              />
            )
          }
        >
          Payments
        </CardTitle>
        {shown.length === 0 ? (
          <Text size="sm" c="dimmed">
            No payments recorded for this family yet.
          </Text>
        ) : (
          <PaymentsTable payments={shown} showChild today={today} timezone={timezone} />
        )}
      </Card>
    </Stack>
  );
}
