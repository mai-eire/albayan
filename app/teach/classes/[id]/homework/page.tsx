import { Stack, Text } from "@mantine/core";
import { IconBook } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { HomeworkTable } from "@/app/teach/homework/HomeworkTable";
import { AddHomeworkButton } from "@/app/teach/homework/HomeworkForm";
import { listHomeworkForClass, listHomeworkTargets } from "@/lib/db/queries/homework";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { todayIn } from "@/lib/time";
import { loadTeacherClass } from "../load";

type Props = { params: Promise<{ id: string }> };

export default async function ClassHomeworkPage({ params }: Props) {
  const [{ user, cls }, { timezone }] = await Promise.all([
    loadTeacherClass(params),
    getSchoolSettings(),
  ]);
  const [rows, allTargets] = await Promise.all([
    listHomeworkForClass(cls.id),
    user.teacher ? listHomeworkTargets(user.teacher.id, cls.academicYearId) : [],
  ]);
  const targets = allTargets.filter((t) => t.classId === cls.id);
  return (
    <Stack gap="md">
      {targets.length > 0 && (
        <div>
          <AddHomeworkButton targets={targets} />
        </div>
      )}
      {rows.length === 0 ? (
        <EmptyState
          icon={<IconBook size={20} stroke={1.75} />}
          message="No homework set for this class yet."
        />
      ) : (
        <>
          <HomeworkTable
            rows={rows}
            targets={targets}
            today={todayIn(timezone)}
            timezone={timezone}
          />
          <Text size="sm" c="dimmed">
            You can change homework for the subjects you teach here.
          </Text>
        </>
      )}
    </Stack>
  );
}
