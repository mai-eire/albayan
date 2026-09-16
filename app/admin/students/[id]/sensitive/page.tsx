import { Stack, Text, Title } from "@mantine/core";
import { SensitiveSection } from "@/components/SensitiveSection";
import { reasonLabels } from "@/lib/demographics";
import { EthnicityForm } from "../forms";
import { loadStudent } from "../load";

type Props = { params: Promise<{ id: string }> };

export default async function StudentSensitivePage({ params }: Props) {
  const student = await loadStudent(params);
  return (
    <SensitiveSection>
      <Stack gap="lg">
        <EthnicityForm student={student} />
        {student.sensitive.guardians.map((g) => (
          <Stack key={g.id} gap={4}>
            <Title order={4}>{g.name}</Title>
            <Text size="sm">Address: {g.address ?? "Not given"}</Text>
            <Text size="sm">
              Languages at home:{" "}
              {g.spokenLanguages.length ? g.spokenLanguages.join(", ") : "Not given"}
            </Text>
            <Text size="sm">Ethnicity: {g.ethnicity ?? "Prefer not to say"}</Text>
            <Text size="sm">
              Reasons for registering:{" "}
              {g.registrationReasons.length
                ? g.registrationReasons
                    .map((r) =>
                      r === "other" && g.registrationReasonOther
                        ? g.registrationReasonOther
                        : reasonLabels[r as keyof typeof reasonLabels],
                    )
                    .join(", ")
                : "Not given"}
            </Text>
          </Stack>
        ))}
      </Stack>
    </SensitiveSection>
  );
}
