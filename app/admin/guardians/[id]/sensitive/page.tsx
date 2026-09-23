import { SimpleGrid } from "@mantine/core";
import { notFound } from "next/navigation";
import { EditableCard } from "@/components/EditableCard";
import { Field } from "@/components/Field";
import { SensitiveSection } from "@/components/SensitiveSection";
import { getGuardianForAdmin } from "@/lib/db/queries/students";
import { reasonLabels } from "@/lib/demographics";
import { SensitiveForm } from "../forms";

type Props = { params: Promise<{ id: string }> };

// Address and the diversity answers: admin-only, on their own tab like the student's.
export default async function GuardianSensitivePage({ params }: Props) {
  const guardian = await getGuardianForAdmin(Number((await params).id));
  if (!guardian) notFound();
  const s = guardian.sensitive;
  return (
    <SensitiveSection>
      <EditableCard
        title="About the family"
        view={
          <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="md">
            <Field label="Address" value={s.address ?? "Not given"} />
            <Field
              label="Languages at home"
              value={s.spokenLanguages.length ? s.spokenLanguages.join(", ") : "Not given"}
            />
            <Field label="Country of origin" value={s.countryOfOrigin ?? "Prefer not to say"} />
            <Field
              label="Reasons for registering"
              value={
                s.registrationReasons.length
                  ? s.registrationReasons
                      .map((r) =>
                        r === "other" && s.registrationReasonOther
                          ? s.registrationReasonOther
                          : reasonLabels[r],
                      )
                      .join(", ")
                  : "Not given"
              }
            />
          </SimpleGrid>
        }
      >
        <SensitiveForm guardian={guardian} />
      </EditableCard>
    </SensitiveSection>
  );
}
