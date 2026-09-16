import { Stack } from "@mantine/core";
import { IconBook } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { requireArea } from "@/lib/access";
import { getCurrentYear } from "@/lib/db/queries/academics";
import { listHomeworkForTeacher, listHomeworkTargets } from "@/lib/db/queries/homework";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { todayIn } from "@/lib/time";
import { AddHomeworkButton } from "./HomeworkForm";
import { HomeworkTable } from "./HomeworkTable";

export const metadata = { title: "Homework" };

export default async function TeacherHomeworkPage() {
  const [user, { timezone }, year] = await Promise.all([
    requireArea("teach"),
    getSchoolSettings(),
    getCurrentYear(),
  ]);
  const [rows, targets] =
    user.teacher && year
      ? await Promise.all([
          listHomeworkForTeacher(user.teacher.id, year.id),
          listHomeworkTargets(user.teacher.id, year.id),
        ])
      : [[], []];
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader
        title="Homework"
        actions={targets.length > 0 && <AddHomeworkButton targets={targets} />}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<IconBook size={20} stroke={1.75} />}
          message={
            targets.length
              ? "No homework set yet. Families see it the moment you publish."
              : "You'll be able to set homework once you're teaching a class."
          }
        />
      ) : (
        <HomeworkTable
          rows={rows}
          targets={targets}
          today={todayIn(timezone)}
          timezone={timezone}
        />
      )}
    </Stack>
  );
}
