import { Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Text } from "@mantine/core";
import { MoneyText } from "@/components/MoneyText";
import { Nothing } from "@/components/Nothing";
import type { PaymentRow } from "@/lib/db/queries/fees";
import { methodLabels } from "@/lib/fees";
import { formatDate } from "@/lib/time";

// What the office has recorded, for the family to check against their own records. The
// one table families see (§4.5): a ledger is a table. Read-only — corrections are the
// office's to make.
export function PaymentHistory({
  payments,
  showChild,
  timezone,
}: {
  payments: PaymentRow[];
  showChild?: boolean;
  timezone: string;
}) {
  return (
    <Table>
      <TableThead>
        <TableTr>
          <TableTh>Paid on</TableTh>
          {showChild && <TableTh>Child</TableTh>}
          <TableTh ta="end">Amount</TableTh>
          <TableTh>How</TableTh>
          <TableTh>Reference</TableTh>
        </TableTr>
      </TableThead>
      <TableTbody>
        {payments.map((p) => (
          <TableTr key={p.id}>
            <TableTd>{formatDate(p.paidOn, timezone, true)}</TableTd>
            {showChild && <TableTd>{p.studentName}</TableTd>}
            <TableTd ta="end">
              <MoneyText cents={p.amountCents} fw={500} />
            </TableTd>
            <TableTd>{methodLabels[p.method]}</TableTd>
            <TableTd>
              {p.reference ?? <Nothing>none</Nothing>}
              {p.note && (
                <Text size="sm" c="dimmed">
                  {p.note}
                </Text>
              )}
            </TableTd>
          </TableTr>
        ))}
      </TableTbody>
    </Table>
  );
}
