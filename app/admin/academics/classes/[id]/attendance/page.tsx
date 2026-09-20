import { clock } from "@/lib/clock";
import { Card, Group, Text } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { RegistersTable } from "@/components/RegistersTable";
import { TodayButton } from "@/components/TodayButton";
import { currentPeriod } from "@/lib/db/queries/academics";
import { listRegistersForTerm } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { todayIn } from "@/lib/time";
import { loadClass } from "../load";

type Props = { params: Promise<{ id: string }> };

// This term's registers for the class — the attendance sheet narrowed to one class, with
// only the register-status filter.
export default async function ClassAttendancePage({ params }: Props) {
  const [cls, { timezone }] = await Promise.all([loadClass(params), getSchoolSettings()]);
  const today = todayIn(timezone, await clock());
  const period = await currentPeriod(today);
  const rows = period
    ? (
        await listRegistersForTerm(
          cls.academicYearId,
          period.from,
          period.to < today ? period.to : today,
        )
      ).filter((r) => r.classId === cls.id)
    : [];
  const missing = rows.filter((r) => r.studentCount > 0 && r.recordedCount < r.studentCount);
  return (
    <Card>
      <CardTitle
        context={
          <Group gap="sm">
            {period && (
              <Text size="sm" c="dimmed">
                {period.label} ·{" "}
                {missing.length ? `${missing.length} still to come` : "all registers in"}
              </Text>
            )}
            {rows.length > 0 && <TodayButton today={today} size="sm" />}
          </Group>
        }
      >
        Registers
      </CardTitle>
      {rows.length === 0 ? (
        <Text size="sm" c="dimmed">
          No lessons yet this term.
        </Text>
      ) : (
        <RegistersTable
          rows={rows}
          hrefBase="/admin/attendance"
          filters={["date", "register"]}
          showClass={false}
        />
      )}
    </Card>
  );
}
