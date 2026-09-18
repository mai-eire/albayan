import {
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import { ClassTimetable } from "@/components/ClassTimetable";
import { DateText } from "@/components/DateText";
import { Field } from "@/components/Field";
import { Figures } from "@/components/Figures";
import { MoneyText } from "@/components/MoneyText";
import { StatusBadge } from "@/components/StatusBadge";
import {
  classChoice,
  currentPeriod,
  getClass,
  listClasses,
  listTeachers,
} from "@/lib/db/queries/academics";
import { familyOverviewFor } from "@/lib/db/queries/families";
import {
  countRegistersTaken,
  listAttendanceForStudent,
  summariseAttendance,
} from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { countEnrolledSiblings } from "@/lib/db/queries/students";
import { formatDate, todayIn } from "@/lib/time";
import { EditFeeButton } from "./EditFeeButton";
import { MoveClassButton } from "./MoveClassButton";
import { loadStudent } from "../load";

type Props = { params: Promise<{ id: string }> };

// The student's place this year — class, fee, and the two things the office asks about
// it: how their attendance is going, and what their day looks like.
export default async function StudentClassPage({ params }: Props) {
  const [student, { timezone }] = await Promise.all([loadStudent(params), getSchoolSettings()]);
  const e = student.enrolment;
  if (!e) {
    return (
      <Card>
        <CardTitle>No place yet</CardTitle>
        <Text size="sm" c="dimmed">
          {student.status === "applied"
            ? "Waiting for a decision on the application."
            : "This student isn't placed in a class."}
        </Text>
      </Card>
    );
  }
  const today = todayIn(timezone);
  const [siblings, cls, teachers, allClasses, period, recent, families] = await Promise.all([
    countEnrolledSiblings(student.id),
    getClass(e.classId),
    listTeachers(),
    listClasses(e.academicYearId),
    currentPeriod(today),
    listAttendanceForStudent(student.id, 8),
    familyOverviewFor([student.id], e.academicYearId),
  ]);
  const to = period ? (period.to < today ? period.to : today) : today;
  const [summary, registersTaken] = period
    ? await Promise.all([
        summariseAttendance(e.classId, period.from, to),
        countRegistersTaken(e.classId, period.from, to),
      ])
    : [[], 0];
  const mine = summary.find((s) => s.studentId === student.id);
  const current = allClasses.find((c) => c.id === e.classId);
  const teacherName = (id: number | undefined) => teachers.find((t) => t.id === id)?.name ?? null;
  const figure = (label: string, n: number | undefined, color?: "saffron" | "clay") => ({
    label,
    value: registersTaken ? `${n ?? 0} / ${registersTaken}` : "none yet",
    color: n ? color : undefined,
  });
  return (
    <Stack gap="lg">
      <Card>
        <CardTitle
          context={
            <Group gap="xs">
              <EditFeeButton
                enrolmentId={e.id}
                feeCents={e.feeCents}
                feeNote={e.feeNote}
                siblings={siblings}
              />
              {current && (
                <MoveClassButton
                  student={{ enrolmentId: e.id, firstName: student.firstName }}
                  current={classChoice(current)}
                  options={allClasses.filter((c) => c.id !== e.classId).map(classChoice)}
                  family={families.get(student.id) ?? []}
                />
              )}
            </Group>
          }
        >
          Place for {e.academicYearId}
        </CardTitle>
        <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="md">
          <Field
            label="Class"
            value={<AppLink href={`/admin/academics/classes/${e.classId}`}>{e.className}</AppLink>}
          />
          <Field label="Session" value={e.sessionName} />
          <Field label="Since" value={<DateText date={e.startDate} withYear />} />
          <Field
            label="Fee"
            value={
              <>
                <MoneyText cents={e.feeCents} />
                {e.feeNote && (
                  <Text size="sm" c="dimmed" component="span">
                    {" "}
                    · {e.feeNote}
                  </Text>
                )}
              </>
            }
          />
        </SimpleGrid>
      </Card>
      <Card>
        <CardTitle
          context={
            period && (
              <Text size="sm" c="dimmed">
                {period.label} · {registersTaken} {registersTaken === 1 ? "register" : "registers"}{" "}
                taken
              </Text>
            )
          }
        >
          Attendance
        </CardTitle>
        <Figures
          items={[
            figure("Present", mine?.present),
            figure("Late", mine?.late, "saffron"),
            figure("Absent", mine?.absent, "clay"),
            figure("Excused", mine?.excused),
          ]}
        />
        {recent.length > 0 && (
          <Table mt="lg">
            <TableThead>
              <TableTr>
                <TableTh>Date</TableTh>
                <TableTh>Session</TableTh>
                <TableTh>Status</TableTh>
                <TableTh>Note</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {recent.map((a) => (
                <TableTr key={a.date}>
                  <TableTd>
                    <AppLink href={`/admin/attendance/${e.classId}?date=${a.date}`}>
                      {formatDate(a.date, timezone)}
                    </AppLink>
                  </TableTd>
                  <TableTd>{a.sessionName}</TableTd>
                  <TableTd>
                    <StatusBadge domain="attendance" value={a.status} />
                  </TableTd>
                  <TableTd>{a.note ?? ""}</TableTd>
                </TableTr>
              ))}
            </TableTbody>
          </Table>
        )}
      </Card>
      {cls && (
        <Card>
          <CardTitle>
            Every {cls.session.name}
            {cls.room && (
              <Text component="span" c="dimmed" fw={400}>
                {" "}
                · {cls.room}
              </Text>
            )}
          </CardTitle>
          <ClassTimetable
            startTime={cls.session.startTime}
            periods={cls.periods.map((p) => ({
              ...p,
              detail: p.subjectId
                ? teacherName(cls.assignments.find((a) => a.subjectId === p.subjectId)?.teacherId)
                : null,
            }))}
          />
        </Card>
      )}
    </Stack>
  );
}
