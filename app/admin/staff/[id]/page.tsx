import { Card, SimpleGrid, Stack, Text } from "@mantine/core";
import { notFound } from "next/navigation";
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import { EntityList } from "@/components/EntityList";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { getCurrentYear } from "@/lib/db/queries/academics";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { getStaffMember } from "@/lib/db/queries/staff";
import { categoryLabels } from "@/lib/note-labels";
import { formatDate } from "@/lib/time";

type Props = { params: Promise<{ id: string }> };

// One staff member: account, this year's classes with their session times, notes written.
export default async function StaffMemberPage({ params }: Props) {
  const [{ id }, year, { timezone }] = await Promise.all([
    params,
    getCurrentYear(),
    getSchoolSettings(),
  ]);
  const person = await getStaffMember(Number(id), year?.id ?? null);
  if (!person) notFound();
  const roles = [
    person.isAdmin && "Admin",
    person.teacher && (person.teacher.isActive ? "Teacher" : "Former teacher"),
  ].filter(Boolean);
  return (
    <Stack gap="lg" maw={860}>
      <PageHeader
        breadcrumbs={[{ label: "Staff", href: "/admin/staff" }]}
        eyebrow={roles.join(" · ")}
        title={person.name}
        actions={<StatusBadge domain="account" value={person.status} size="md" />}
      />
      <Card>
        <CardTitle>Account</CardTitle>
        <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="md">
          <Field label="Email" value={person.email} />
          <Field label="Phone" value={person.phone} />
          <Field
            label="Last sign-in"
            value={person.lastSignInAt ? formatDate(person.lastSignInAt, timezone, true) : "Never"}
          />
          <Field
            label={person.teacher?.deactivatedAt ? "Stopped teaching" : "Since"}
            value={formatDate(person.teacher?.deactivatedAt ?? person.createdAt, timezone, true)}
          />
        </SimpleGrid>
      </Card>
      {person.teacher && (
        <Card>
          <CardTitle>
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
            <EntityList
              items={person.classes.map((c) => ({
                key: c.id,
                title: c.name,
                detail: [
                  `${c.sessionName} ${c.startTime}–${c.endTime}`,
                  c.isClassTeacher && "Class teacher",
                  c.subjects.join(", "),
                ]
                  .filter(Boolean)
                  .join(" · "),
                href: `/admin/academics/classes/${c.id}`,
              }))}
            />
          )}
        </Card>
      )}
      <Card>
        <CardTitle>
          Notes written
          <Text component="span" c="dimmed" fw={400}>
            {" "}
            {person.noteCount}
          </Text>
        </CardTitle>
        {person.notes.length === 0 ? (
          <Text size="sm" c="dimmed">
            None yet.
          </Text>
        ) : (
          <Stack gap="sm">
            {person.notes.map((n) => (
              <div key={n.id}>
                <Text size="sm" c="dimmed">
                  <AppLink href={`/admin/students/${n.studentId}/notes`} size="sm">
                    {n.studentName}
                  </AppLink>{" "}
                  · {categoryLabels[n.category as keyof typeof categoryLabels]} ·{" "}
                  {formatDate(n.createdAt, timezone, true)}
                </Text>
                <Text size="sm" lineClamp={2}>
                  {n.body}
                </Text>
              </div>
            ))}
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
