import {
  Badge,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { IconCalendar } from "@tabler/icons-react";
import { AppLink } from "@/components/AppLink";
import { EmptyState } from "@/components/EmptyState";
import { MoneyText } from "@/components/MoneyText";
import type { YearRow } from "@/lib/db/queries/academics";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate } from "@/lib/time";

export async function YearsTable({ years }: { years: YearRow[] }) {
  if (!years.length) {
    return (
      <EmptyState
        icon={<IconCalendar size={20} stroke={1.75} />}
        message="No academic years yet. Add the first one to start setting up the school."
      />
    );
  }
  const { timezone } = await getSchoolSettings();
  return (
    <Table>
      <TableThead>
        <TableTr>
          <TableTh>Year</TableTh>
          <TableTh>Dates</TableTh>
          <TableTh>Terms</TableTh>
          <TableTh ta="end">Standard fee</TableTh>
        </TableTr>
      </TableThead>
      <TableTbody>
        {years.map((year) => (
          <TableTr key={year.id}>
            <TableTd>
              <AppLink href={`/admin/academics/years/${year.id}`} fw={600}>
                {year.id}
              </AppLink>
              {year.isCurrent && (
                <Badge ms="sm" color="tile">
                  Current
                </Badge>
              )}
            </TableTd>
            <TableTd>
              <Text size="sm">
                {formatDate(year.startDate, timezone, true)} –{" "}
                {formatDate(year.endDate, timezone, true)}
              </Text>
            </TableTd>
            <TableTd>{year.termCount}</TableTd>
            <TableTd ta="end">
              <MoneyText cents={year.standardFeeCents} />
            </TableTd>
          </TableTr>
        ))}
      </TableTbody>
    </Table>
  );
}
