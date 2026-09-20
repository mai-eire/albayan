import {
  Badge,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";
import { AppLink } from "@/components/AppLink";
import { Places } from "@/components/Places";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { requireArea } from "@/lib/access";
import { getCurrentYear } from "@/lib/db/queries/academics";
import { listClassesForTeacher } from "@/lib/db/queries/teach";

export const metadata = { title: "My classes" };

export default async function TeacherClassesPage() {
  const [user, year] = await Promise.all([requireArea("teacher"), getCurrentYear()]);
  const rows = user.teacher && year ? await listClassesForTeacher(user.teacher.id, year.id) : [];
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader title="My classes" eyebrow={year?.id} />
      {rows.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={20} stroke={1.75} />}
          message="You haven't been given a class yet. The office sets these up."
        />
      ) : (
        <Table>
          <TableThead>
            <TableTr>
              <TableTh>Class</TableTh>
              <TableTh>Session</TableTh>
              <TableTh>You teach</TableTh>
              <TableTh ta="end">Students</TableTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            {rows.map((c) => (
              <TableTr key={c.id}>
                <TableTd>
                  <AppLink href={`/teacher/classes/${c.id}`} fw={500}>
                    {c.name}
                  </AppLink>
                  {c.room && (
                    <Text size="sm" c="dimmed">
                      {c.room}
                    </Text>
                  )}
                </TableTd>
                <TableTd>
                  {c.sessionName} {c.startTime}
                </TableTd>
                <TableTd>
                  {c.subjects.join(", ")}
                  {c.isClassTeacher && (
                    <Badge variant="outline" color="gray" ms="xs">
                      Class teacher
                    </Badge>
                  )}
                </TableTd>
                <TableTd ta="end">
                  <Places count={c.studentCount} capacity={c.capacity} />
                </TableTd>
              </TableTr>
            ))}
          </TableTbody>
        </Table>
      )}
    </Stack>
  );
}
