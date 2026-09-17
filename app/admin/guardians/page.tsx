import {
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { IconUsersGroup } from "@tabler/icons-react";
import { AppLink } from "@/components/AppLink";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { listGuardiansForAdmin } from "@/lib/db/queries/students";
import { SearchBox } from "./SearchBox";

export const metadata = { title: "Guardians" };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function GuardiansPage({ searchParams }: Props) {
  const q = (await searchParams).q?.trim() || undefined;
  const rows = await listGuardiansForAdmin(q);
  return (
    <Stack gap="lg" maw={960}>
      <PageHeader title="Guardians" eyebrow={`${rows.length} shown`} />
      <SearchBox />
      {rows.length === 0 ? (
        <EmptyState
          icon={<IconUsersGroup size={20} stroke={1.75} />}
          message="No guardians match that search."
        />
      ) : (
        <Table>
          <TableThead>
            <TableTr>
              <TableTh>Guardian</TableTh>
              <TableTh>Email</TableTh>
              <TableTh>Phone</TableTh>
              <TableTh>Children</TableTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            {rows.map((g) => (
              <TableTr key={g.id}>
                <TableTd>
                  <AppLink href={`/admin/guardians/${g.id}`} fw={500}>
                    {g.name}
                  </AppLink>
                </TableTd>
                <TableTd>
                  <Text component="span" c="dimmed">
                    {g.email}
                  </Text>
                </TableTd>
                <TableTd>{g.phone ?? "—"}</TableTd>
                <TableTd>{g.children.length ? g.children.join(", ") : "—"}</TableTd>
              </TableTr>
            ))}
          </TableTbody>
        </Table>
      )}
    </Stack>
  );
}
