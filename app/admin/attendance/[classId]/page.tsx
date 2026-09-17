import { Stack } from "@mantine/core";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { requireArea } from "@/lib/access";
import { getRegister } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate, todayIn } from "@/lib/time";
import { RegisterEditor } from "@/app/teach/attendance/[classId]/RegisterEditor";

type Props = { params: Promise<{ classId: string }>; searchParams: Promise<{ date?: string }> };

// Admin can view and correct any day's register; the action audits edits after the day.
export default async function AdminRegisterPage({ params, searchParams }: Props) {
  const [{ classId }, { date: requested }, { timezone }] = await Promise.all([
    params,
    searchParams,
    getSchoolSettings(),
  ]);
  await requireArea("admin");
  const today = todayIn(timezone);
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today;
  if (date > today) notFound();
  const register = await getRegister(Number(classId), date);
  if (!register) notFound();
  return (
    <Stack gap="lg" maw={720}>
      <PageHeader
        breadcrumbs={[{ label: "Attendance", href: `/admin/attendance?date=${date}` }]}
        eyebrow={`${register.className} · ${register.sessionName}`}
        title={formatDate(date, timezone, true)}
      />
      <RegisterEditor register={register} editable backHref={`/admin/attendance?date=${date}`} />
    </Stack>
  );
}
