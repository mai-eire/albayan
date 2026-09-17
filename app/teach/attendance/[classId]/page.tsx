import { Stack } from "@mantine/core";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { canEditRegister, loadClassFacts, requireArea, teachesClass } from "@/lib/access";
import { getRegister } from "@/lib/db/queries/attendance";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate, todayIn } from "@/lib/time";
import { RegisterEditor } from "./RegisterEditor";

type Props = { params: Promise<{ classId: string }>; searchParams: Promise<{ date?: string }> };

export default async function RegisterPage({ params, searchParams }: Props) {
  const classId = Number((await params).classId);
  const [user, facts, { timezone }, { date: requested }] = await Promise.all([
    requireArea("teach"),
    loadClassFacts(classId),
    getSchoolSettings(),
    searchParams,
  ]);
  if (!facts || !teachesClass(user, facts)) notFound();
  const today = todayIn(timezone);
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today;
  const register = await getRegister(classId, date);
  if (!register) notFound();
  return (
    <Stack gap="lg" maw={720} mx="auto">
      <PageHeader
        breadcrumbs={[
          { label: "My classes", href: "/teach/classes" },
          { label: register.className, href: `/teach/classes/${classId}/attendance` },
        ]}
        eyebrow={register.sessionName}
        title={formatDate(date, timezone, date.slice(0, 4) !== today.slice(0, 4))}
      />
      <RegisterEditor
        register={register}
        editable={canEditRegister(user, facts, date, today)}
        backHref="/teach/attendance"
      />
    </Stack>
  );
}
