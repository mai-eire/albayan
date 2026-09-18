import { Card, SimpleGrid, Stack } from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import { EditableCard } from "@/components/EditableCard";
import { Field } from "@/components/Field";
import { Figures } from "@/components/Figures";
import { formatDate } from "@/lib/time";
import { StaffContactForm } from "./ContactForm";
import { loadStaffMember } from "./load";

type Props = { params: Promise<{ id: string }> };

// Account details and the term's figures: classes, registers taken of those due, notes.
export default async function StaffOverviewPage({ params }: Props) {
  const { person, period, timezone, registers } = await loadStaffMember(params);
  return (
    <Stack gap="lg">
      <EditableCard
        title="Account"
        view={
          <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="md">
            <Field label="Email" value={person.email} />
            <Field label="Phone" value={person.phone} />
            <Field
              label="Last sign-in"
              value={
                person.lastSignInAt ? formatDate(person.lastSignInAt, timezone, true) : "Never"
              }
            />
            <Field
              label={person.teacher?.deactivatedAt ? "Stopped teaching" : "Since"}
              value={formatDate(person.teacher?.deactivatedAt ?? person.createdAt, timezone, true)}
            />
          </SimpleGrid>
        }
      >
        <StaffContactForm
          person={{ id: person.id, name: person.name, email: person.email, phone: person.phone }}
        />
      </EditableCard>
      {person.teacher && (
        <Card>
          <CardTitle>{period ? `This term · ${period.label}` : "This year"}</CardTitle>
          <Figures
            items={[
              { label: "Classes", value: person.classes.length },
              {
                label: "Registers taken",
                value: registers.due ? (
                  <AppLink href={`/admin/attendance?teacher=${person.teacher.id}`} c="inherit">
                    {registers.taken} / {registers.due}
                  </AppLink>
                ) : (
                  "none yet"
                ),
                hint: registers.due ? "of those due so far · open them" : "no lessons yet",
                color: registers.due && registers.taken < registers.due ? "saffron" : undefined,
              },
              { label: "Notes written", value: person.noteCount },
            ]}
          />
        </Card>
      )}
    </Stack>
  );
}
