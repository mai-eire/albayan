import {
  Badge,
  Card,
  Grid,
  GridCol,
  Group,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { clock } from "@/lib/clock";
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import { ClassTimetable } from "@/components/ClassTimetable";
import { Places } from "@/components/Places";
import { ageOn } from "@/lib/age";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { proficiencyLabels } from "@/lib/demographics";
import { todayIn } from "@/lib/time";
import { loadTeacherClass } from "./load";

type Props = { params: Promise<{ id: string }> };

export default async function TeacherClassPage({ params }: Props) {
  const [{ cls }, { timezone }] = await Promise.all([
    loadTeacherClass(params),
    getSchoolSettings(),
  ]);
  const today = todayIn(timezone, await clock());
  return (
    <Grid gap="lg">
      <GridCol span={{ base: 12, md: 7 }}>
        <Card>
          <CardTitle>
            <Group gap="xs">
              Students
              <Text component="span" fw={400}>
                <Places count={cls.roster.length} capacity={cls.capacity} />
              </Text>
            </Group>
          </CardTitle>
          {cls.roster.length === 0 ? (
            <Text size="sm" c="dimmed">
              Nobody has been placed in this class yet.
            </Text>
          ) : (
            <Table>
              <TableThead>
                <TableTr>
                  <TableTh>Name</TableTh>
                  <TableTh>Age</TableTh>
                  <TableTh>Arabic</TableTh>
                  <TableTh />
                </TableTr>
              </TableThead>
              <TableTbody>
                {cls.roster.map((s) => (
                  <TableTr key={s.id}>
                    <TableTd style={{ whiteSpace: "nowrap" }}>
                      <AppLink href={`/teacher/students/${s.id}`} fw={500}>
                        {s.firstName} {s.lastName}
                      </AppLink>
                    </TableTd>
                    <TableTd>{ageOn(s.dateOfBirth, today)}</TableTd>
                    <TableTd>{proficiencyLabels[s.arabicProficiency]}</TableTd>
                    <TableTd style={{ whiteSpace: "nowrap" }}>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        {s.hasAllergies && (
                          <Badge color="clay" size="xs">
                            Allergies
                          </Badge>
                        )}
                        {s.hasMedicalNotes && (
                          <Badge color="saffron" size="xs">
                            Medical
                          </Badge>
                        )}
                      </Group>
                    </TableTd>
                  </TableTr>
                ))}
              </TableTbody>
            </Table>
          )}
        </Card>
      </GridCol>
      <GridCol span={{ base: 12, md: 5 }}>
        <Card>
          <CardTitle>Timetable</CardTitle>
          <ClassTimetable
            startTime={cls.session.startTime}
            periods={cls.periods.map((p) => ({ ...p, detail: p.teacherName }))}
          />
        </Card>
      </GridCol>
    </Grid>
  );
}
