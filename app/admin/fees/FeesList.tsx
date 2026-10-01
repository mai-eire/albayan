"use client";

import { Card } from "@mantine/core";
import { IconBuildingBank } from "@tabler/icons-react";
import type { ClassFilterOption } from "@/components/ClassFilter";
import { EmptyState } from "@/components/EmptyState";
import { Figures } from "@/components/Figures";
import { useUrlFilters } from "@/components/useUrlFilters";
import type { FeeAccountRow, PaymentTarget } from "@/lib/db/queries/fees";
import { outstandingCents } from "@/lib/fees";
import { formatEuros } from "@/lib/money";
import { FeesFilters } from "./FeesFilters";
import { FeesTable } from "./FeesTable";
import { applyFeeFilters, parseFeeFilters, type FeeShow } from "./filters";

type Props = {
  accounts: FeeAccountRow[];
  years: { id: string; isCurrent: boolean }[];
  year: string;
  sessions: { id: number; name: string }[];
  classes: ClassFilterOption[];
  // Passed down so a row can record a payment for its own child.
  targets: PaymentTarget[];
  today: string;
};

// "(63%)" of the fees; nothing when there are no fees to be a share of.
const share = (part: number, whole: number) =>
  whole > 0 ? `(${Math.round((part / whole) * 100)}%)` : undefined;

// The year's accounts, narrowed in the browser: totals above the table, then who owes what.
export function FeesList({ accounts, years, year, sessions, classes, targets, today }: Props) {
  const { query, set } = useUrlFilters();
  const filters = parseFeeFilters(query);
  const rows = applyFeeFilters(accounts, filters);
  // The figures describe everyone matching the other filters; pressing one narrows the
  // table to the rows it counts.
  const scope = applyFeeFilters(accounts, { ...filters, show: "everyone" });
  const totals = {
    students: scope.length,
    fee: scope.reduce((s, a) => s + a.feeCents, 0),
    paid: scope.reduce((s, a) => s + a.paidCents, 0),
    balance: outstandingCents(scope),
    owing: scope.filter((a) => a.balanceCents > 0).length,
  };
  const show = (value: FeeShow) => ({
    onClick: () => set({ show: value }),
    active: filters.show === value,
  });
  return (
    <>
      {scope.length > 0 && (
        <Card>
          <Figures
            items={[
              {
                label: "Students",
                value: totals.students,
                hint: `${totals.owing} still to pay`,
                ...show("outstanding"),
              },
              { label: "Fees", value: formatEuros(totals.fee), ...show("everyone") },
              {
                label: "Paid",
                value: formatEuros(totals.paid),
                aside: share(totals.paid, totals.fee),
                ...show("paid"),
              },
              {
                label: "Outstanding",
                value: formatEuros(totals.balance),
                aside: share(totals.balance, totals.fee),
                color: totals.balance ? "saffron" : undefined,
                ...show("outstanding"),
              },
            ]}
          />
        </Card>
      )}
      <FeesFilters years={years} year={year} sessions={sessions} classes={classes} />
      {rows.length === 0 ? (
        <EmptyState
          icon={<IconBuildingBank size={20} stroke={1.75} />}
          message={
            accounts.length === 0
              ? "Approving an application gives a child a place and a fee."
              : filters.show === "outstanding"
                ? "Everyone here has paid."
                : filters.show === "paid"
                  ? "Nobody here has paid anything yet."
                  : "Nobody matches these filters."
          }
        />
      ) : (
        <FeesTable rows={rows} targets={targets} today={today} />
      )}
    </>
  );
}
