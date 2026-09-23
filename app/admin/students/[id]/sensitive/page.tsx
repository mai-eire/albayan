import { Card, SimpleGrid, Stack, Text } from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import { EditableCard } from "@/components/EditableCard";
import { Field } from "@/components/Field";
import { SensitiveSection } from "@/components/SensitiveSection";
import { reasonLabels } from "@/lib/demographics";
import { CountryOfOriginForm } from "../forms";
import { loadStudent } from "../load";

type Props = { params: Promise<{ id: string }> };

// The student's own sensitive field is edited here; the guardians' are edited on their pages.
export default async function StudentSensitivePage({ params }: Props) {
  const student = await loadStudent(params);
  return (
    <SensitiveSection>
      <Stack gap="md">
        <EditableCard
          title={student.firstName}
          view={
            <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="md">
              <Field
                label="Country of origin"
                value={student.countryOfOrigin ?? "Prefer not to say"}
              />
            </SimpleGrid>
          }
        >
          <CountryOfOriginForm student={student} />
        </EditableCard>
        {student.sensitive.guardians.map((g) => (
          <Card key={g.id}>
            <CardTitle
              context={
                <Text size="sm">
                  <AppLink href={`/admin/guardians/${g.id}`}>Edit on their page</AppLink>
                </Text>
              }
            >
              {g.name}
            </CardTitle>
            <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="md">
              <Field label="Address" value={g.address ?? "Not given"} />
              <Field
                label="Languages at home"
                value={g.spokenLanguages.length ? g.spokenLanguages.join(", ") : "Not given"}
              />
              <Field label="Country of origin" value={g.countryOfOrigin ?? "Prefer not to say"} />
              <Field
                label="Reasons for registering"
                value={
                  g.registrationReasons.length
                    ? g.registrationReasons
                        .map((r) =>
                          r === "other" && g.registrationReasonOther
                            ? g.registrationReasonOther
                            : reasonLabels[r as keyof typeof reasonLabels],
                        )
                        .join(", ")
                    : "Not given"
                }
              />
            </SimpleGrid>
          </Card>
        ))}
      </Stack>
    </SensitiveSection>
  );
}
