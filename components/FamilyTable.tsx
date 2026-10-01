import {
  Table,
  TableScrollContainer,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
} from "@mantine/core";
import type { FamilyMember } from "@/lib/db/queries/families";
import { AppLink } from "./AppLink";
import { Nothing } from "./Nothing";
import { StatusBadge } from "./StatusBadge";

// Brothers and sisters at a glance while deciding about one child: where they are, who
// looks after them, and whether their fee is paid.
export function FamilyTable({ members }: { members: FamilyMember[] }) {
  return (
    <TableScrollContainer minWidth={0} type="native">
      <Table>
        <TableThead>
          <TableTr>
            <TableTh>Child</TableTh>
            <TableTh>Guardians</TableTh>
            <TableTh>Session</TableTh>
            <TableTh>Class</TableTh>
            <TableTh>Status</TableTh>
            <TableTh>Fee</TableTh>
          </TableTr>
        </TableThead>
        <TableTbody>
          {members.map((m) => (
            <TableTr key={m.id}>
              <TableTd>
                <AppLink href={`/admin/students/${m.id}`} fw={500}>
                  {m.firstName} {m.lastName}
                </AppLink>
              </TableTd>
              <TableTd>{m.guardianNames.join(", ") || <Nothing>no guardian</Nothing>}</TableTd>
              <TableTd>{m.sessionName ?? <Nothing>not placed</Nothing>}</TableTd>
              <TableTd>{m.className ?? <Nothing>not placed</Nothing>}</TableTd>
              <TableTd>
                <StatusBadge domain="application" value={m.status} />
              </TableTd>
              <TableTd>
                {m.feeStatus ? (
                  <StatusBadge domain="fee" value={m.feeStatus} />
                ) : (
                  <Nothing>no fee</Nothing>
                )}
              </TableTd>
            </TableTr>
          ))}
        </TableTbody>
      </Table>
    </TableScrollContainer>
  );
}
