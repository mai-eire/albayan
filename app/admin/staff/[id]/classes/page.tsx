import {
  Badge,
  Card,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import { Nothing } from "@/components/Nothing";
import { CardTitle } from "@/components/CardTitle";
import tabular from "@/components/tabular.module.css";
import { loadStaffMember } from "../load";

type Props = { params: Promise<{ id: string }> };

// Each class they take this year with the session's times, what they teach in it, and how
// many of the term's registers are in.
export default async function StaffClassesPage({ params }: Props) {
  const { person, year, period, registers } = await loadStaffMember(params);
  return (
    <Card>
      <CardTitle
        context={
          period && (
            <Text size="sm" c="dimmed">
              Registers · {period.label}
            </Text>
          )
        }
      >
        Classes
        {year && (
          <Text component="span" c="dimmed" fw={400}>
            {" "}
            {year.id}
          </Text>
        )}
      </CardTitle>
      {person.classes.length === 0 ? (
        <Text size="sm" c="dimmed">
          No classes this year.
        </Text>
      ) : (
        <Table>
          <TableThead>
            <TableTr>
              <TableTh>Class</TableTh>
              <TableTh>Session</TableTh>
              <TableTh>Teaches</TableTh>
              <TableTh ta="end">Registers</TableTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            {person.classes.map((c) => {
              const r = registers.byClass(c.id);
              return (
                <TableTr key={c.id}>
                  <TableTd>
                    <AppLink href={`/admin/academics/classes/${c.id}`} fw={500}>
                      {c.name}
                    </AppLink>
                  </TableTd>
                  <TableTd>
                    {c.sessionName} {c.startTime}–{c.endTime}
                  </TableTd>
                  <TableTd>
                    {c.subjects.join(", ")}
                    {c.isClassTeacher && (
                      <Badge variant="outline" color="gray" ms={c.subjects.length ? "xs" : 0}>
                        Class teacher
                      </Badge>
                    )}
                  </TableTd>
                  <TableTd ta="end" className={tabular.tabular}>
                    {r.due ? (
                      <>
                        <Text component="span" fw={500} c={r.taken < r.due ? "saffron" : undefined}>
                          {r.taken}
                        </Text>
                        <Text component="span" c="dimmed">
                          {" "}
                          / {r.due}
                        </Text>
                      </>
                    ) : (
                      <Nothing>none yet</Nothing>
                    )}
                  </TableTd>
                </TableTr>
              );
            })}
          </TableTbody>
        </Table>
      )}
    </Card>
  );
}
