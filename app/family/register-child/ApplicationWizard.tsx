"use client";

import {
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import dayjs from "dayjs";
import { IconCircleCheck } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { z } from "zod";
import { DateField } from "@/components/DateField";
import { Field } from "@/components/Field";
import { FormError } from "@/components/FormError";
import { LinkButton } from "@/components/LinkButton";
import { sensitiveExplanation } from "@/components/SensitiveSection";
import { toast } from "@/components/toast";
import type { guardians } from "@/lib/db/schema";
import { arabicProficiencies, registrationReasons } from "@/lib/db/schema";
import { countryOptions } from "@/lib/countries";
import {
  commonAllergies,
  commonLanguages,
  preferNotToSay,
  proficiencyLabels,
  reasonLabels,
  relationshipLabels,
  relationshipsFor,
  yearGroupSections,
} from "@/lib/demographics";
import { ageOn } from "@/lib/age";
import { submitApplication } from "./actions";
import { childStepSchema, familyStepSchema, guardianStepSchema } from "./schema";

export type DayChoice = { id: number; label: string; classes: { id: number; name: string }[] };

// Mantine's Select needs a string for every option; this one stands for "no preference".
const anyDay = "any";

type Guardian = typeof guardians.$inferSelect;

type Values = {
  relationship: string | null;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  schoolYearGroup: string | null;
  isHomeschooled: boolean;
  arabicProficiency: string;
  allergies: string[];
  medicalNotes: string;
  applicationNotes: string;
  preferredSessionId: number | null;
  preferredClassId: number | null;
  childCountry: string | null;
  guardianCountry: string | null;
  spokenLanguages: string[];
  registrationReasons: string[];
  registrationReasonOther: string;
};

const emptyChild = {
  firstName: "",
  lastName: "",
  dateOfBirth: null,
  gender: null,
  schoolYearGroup: null,
  isHomeschooled: false,
  arabicProficiency: "none",
  allergies: [],
  medicalNotes: "",
  applicationNotes: "",
  preferredSessionId: null,
  preferredClassId: null,
  childCountry: null,
};

const steps = [guardianStepSchema, childStepSchema, familyStepSchema];

// Runs one step's schema over the form values and returns field errors, if any.
function stepErrors(schema: z.ZodType, values: Values): Record<string, string> | null {
  const parsed = schema.safeParse(values);
  if (parsed.success) return null;
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) errors[issue.path.join(".")] ??= issue.message;
  return errors;
}

export function ApplicationWizard({
  guardian,
  lastRelationship,
  days,
}: {
  guardian: Guardian | null;
  // What they said they were to the child they registered last; the default this time.
  lastRelationship: string | null;
  days: DayChoice[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const relationshipOptions = relationshipsFor(guardian?.gender);
  const hasAddress = Boolean(guardian?.addressLine1 && guardian?.city && guardian?.postalCode);
  const [editingAddress, setEditingAddress] = useState(!hasAddress);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const form = useForm<Values>({
    initialValues: {
      relationship:
        lastRelationship ??
        (guardian?.gender === "female" ? "mother" : guardian?.gender === "male" ? "father" : null),
      addressLine1: guardian?.addressLine1 ?? "",
      addressLine2: guardian?.addressLine2 ?? "",
      city: guardian?.city ?? "",
      postalCode: guardian?.postalCode ?? "",
      emergencyContactName: guardian?.emergencyContactName ?? "",
      emergencyContactPhone: guardian?.emergencyContactPhone ?? "",
      emergencyContactRelationship: guardian?.emergencyContactRelationship ?? "",
      ...emptyChild,
      childCountry: guardian?.countryOfOrigin ?? null,
      guardianCountry: guardian?.countryOfOrigin ?? null,
      spokenLanguages: guardian?.spokenLanguages ?? [],
      registrationReasons: guardian?.registrationReasons ?? [],
      registrationReasonOther: guardian?.registrationReasonOther ?? "",
    },
  });

  const next = () => {
    const errors = stepErrors(steps[step], form.values);
    if (errors) {
      form.setErrors(errors);
      return;
    }
    form.clearErrors();
    setStep(step + 1);
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await submitApplication(form.values);
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success(`Application sent for ${form.values.firstName}`);
    setSubmitted(form.values.firstName);
    router.refresh();
  };

  const another = () => {
    form.setValues(emptyChild);
    form.clearErrors();
    setSubmitted(null);
    setStep(1);
  };

  const day = days.find((d) => d.id === form.values.preferredSessionId);
  // Shown under the date of birth as it is picked, so a mistyped year is obvious.
  const age = form.values.dateOfBirth
    ? ageOn(form.values.dateOfBirth, new Date().toISOString().slice(0, 10))
    : null;

  if (submitted) {
    return (
      <Card>
        <Stack align="center" gap="sm" py="md" ta="center">
          <IconCircleCheck size={40} stroke={1.5} color="var(--mantine-color-tile-6)" />
          <Title order={3}>Application received for {submitted}</Title>
          <Text c="dimmed" maw={420}>
            The school will look at it and email you once a place is confirmed. You can see the
            status on your family page.
          </Text>
          <Group mt="sm">
            <LinkButton href="/family" variant="default">
              Back to your family
            </LinkButton>
            <Button onClick={another}>Register another child</Button>
          </Group>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="lg">
      <Stepper active={step} size="sm" allowNextStepsSelect={false} onStepClick={setStep}>
        <Stepper.Step label={<StepLabel>You</StepLabel>}>
          <Stack gap="md" mt="md">
            <Select
              label="Your relationship to the child"
              data={relationshipOptions.map((r) => ({ value: r, label: relationshipLabels[r] }))}
              allowDeselect={false}
              withAsterisk
              {...form.getInputProps("relationship")}
            />
            {editingAddress ? (
              <>
                <TextInput
                  label="Your address"
                  autoComplete="address-line1"
                  withAsterisk
                  {...form.getInputProps("addressLine1")}
                />
                <TextInput
                  label="Address line 2"
                  autoComplete="address-line2"
                  {...form.getInputProps("addressLine2")}
                />
                <Group grow>
                  <TextInput
                    label="Town or city"
                    autoComplete="address-level2"
                    withAsterisk
                    {...form.getInputProps("city")}
                  />
                  <TextInput
                    label="Eircode"
                    autoComplete="postal-code"
                    withAsterisk
                    {...form.getInputProps("postalCode")}
                  />
                </Group>
              </>
            ) : (
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <div>
                  <Text size="xs" c="dimmed">
                    Your address
                  </Text>
                  <Text size="sm">
                    {[
                      form.values.addressLine1,
                      form.values.addressLine2,
                      form.values.city,
                      form.values.postalCode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                </div>
                <Button variant="subtle" size="xs" onClick={() => setEditingAddress(true)}>
                  Change
                </Button>
              </Group>
            )}
            <Title order={4} mt="sm">
              Emergency contact
            </Title>
            <Text size="sm" c="dimmed" mt={-8}>
              Someone we can call if we can&apos;t reach you.
            </Text>
            <TextInput label="Name" withAsterisk {...form.getInputProps("emergencyContactName")} />
            <Group grow>
              <TextInput
                label="Phone"
                type="tel"
                withAsterisk
                {...form.getInputProps("emergencyContactPhone")}
              />
              <TextInput
                label="Relationship to the child"
                placeholder="Aunt, neighbour…"
                withAsterisk
                {...form.getInputProps("emergencyContactRelationship")}
              />
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={<StepLabel>Child</StepLabel>}>
          <Stack gap="md" mt="md">
            <Group grow>
              <TextInput label="First name" withAsterisk {...form.getInputProps("firstName")} />
              <TextInput label="Surname" withAsterisk {...form.getInputProps("lastName")} />
            </Group>
            <Group grow align="flex-start">
              <DateField
                label="Date of birth"
                withAsterisk
                maxDate={new Date()}
                description={age === null ? undefined : `${age} years old`}
                inputWrapperOrder={["label", "input", "description", "error"]}
                {...form.getInputProps("dateOfBirth")}
              />
              <Select
                label="Gender"
                data={[
                  { value: "male", label: "Boy" },
                  { value: "female", label: "Girl" },
                ]}
                allowDeselect={false}
                withAsterisk
                {...form.getInputProps("gender")}
              />
            </Group>
            <Group grow align="flex-start">
              <Stack gap="xs">
                <Select
                  label="School year"
                  description="At their weekday school"
                  data={yearGroupSections}
                  searchable
                  clearable
                  withAsterisk={!form.values.isHomeschooled}
                  disabled={form.values.isHomeschooled}
                  {...form.getInputProps("schoolYearGroup")}
                />
                <Checkbox
                  label="Taught at home"
                  checked={form.values.isHomeschooled}
                  onChange={(e) => {
                    form.setFieldValue("isHomeschooled", e.currentTarget.checked);
                    if (e.currentTarget.checked) form.setFieldValue("schoolYearGroup", null);
                  }}
                />
              </Stack>
              <Select
                label="Arabic level"
                data={arabicProficiencies.map((p) => ({ value: p, label: proficiencyLabels[p] }))}
                allowDeselect={false}
                withAsterisk
                {...form.getInputProps("arabicProficiency")}
              />
            </Group>
            <TagsInput
              label="Allergies"
              description="Pick from the list or type your own. Leave blank if none."
              placeholder={form.values.allergies.length ? undefined : "None"}
              data={commonAllergies}
              maxTags={10}
              {...form.getInputProps("allergies")}
            />
            <Textarea
              label="Medical needs or anything else teachers should know"
              autosize
              minRows={2}
              {...form.getInputProps("medicalNotes")}
            />
            <Textarea
              label="Anything else you'd like the school to know?"
              placeholder="Would prefer to be with their cousin if possible."
              autosize
              minRows={2}
              {...form.getInputProps("applicationNotes")}
            />
            <Group grow align="flex-start">
              <Select
                label="Preferred day"
                description="We'll do our best; the school decides the final day"
                data={[
                  { value: anyDay, label: "Any day" },
                  ...days.map((d) => ({ value: String(d.id), label: d.label })),
                ]}
                allowDeselect={false}
                value={form.values.preferredSessionId?.toString() ?? anyDay}
                onChange={(v) => {
                  form.setFieldValue("preferredSessionId", v && v !== anyDay ? Number(v) : null);
                  form.setFieldValue("preferredClassId", null);
                }}
                error={form.errors.preferredSessionId}
              />
              <Select
                label="Preferred class"
                description="Optional — the school decides the final placement"
                data={(day?.classes ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
                disabled={!day || day.classes.length === 0}
                clearable
                value={form.values.preferredClassId?.toString() ?? null}
                onChange={(v) => form.setFieldValue("preferredClassId", v ? Number(v) : null)}
              />
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={<StepLabel>Family</StepLabel>}>
          <Stack gap="md" mt="md">
            <Text size="sm" c="dimmed">
              {sensitiveExplanation}
            </Text>
            <Group grow align="flex-start">
              <Select
                label="Your country of origin"
                data={countryOptions(preferNotToSay)}
                searchable
                value={form.values.guardianCountry ?? preferNotToSay}
                onChange={(v) => {
                  const next = v === preferNotToSay ? null : v;
                  // The child's answer follows yours until you change the child's yourself.
                  if (form.values.childCountry === form.values.guardianCountry) {
                    form.setFieldValue("childCountry", next);
                  }
                  form.setFieldValue("guardianCountry", next);
                }}
                allowDeselect={false}
              />
              <Select
                label={`${form.values.firstName || "Your child"}'s country of origin`}
                data={countryOptions(preferNotToSay)}
                searchable
                value={form.values.childCountry ?? preferNotToSay}
                onChange={(v) =>
                  form.setFieldValue("childCountry", v === preferNotToSay ? null : v)
                }
                allowDeselect={false}
              />
            </Group>
            <TagsInput
              label="Languages spoken at home"
              description="Pick from the list or type your own"
              data={commonLanguages}
              maxTags={10}
              {...form.getInputProps("spokenLanguages")}
            />
            <Checkbox.Group
              label="Why are you registering with us?"
              {...form.getInputProps("registrationReasons")}
            >
              <Stack gap="xs" mt="xs">
                {registrationReasons.map((r) => (
                  <Checkbox key={r} value={r} label={reasonLabels[r]} />
                ))}
              </Stack>
            </Checkbox.Group>
            {form.values.registrationReasons.includes("other") && (
              <TextInput label="Tell us more" {...form.getInputProps("registrationReasonOther")} />
            )}
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={<StepLabel>Review</StepLabel>}>
          <Stack gap="md" mt="md">
            <Review
              title="Child"
              rows={[
                ["Name", `${form.values.firstName} ${form.values.lastName}`],
                [
                  "Date of birth",
                  form.values.dateOfBirth && dayjs(form.values.dateOfBirth).format("D MMMM YYYY"),
                ],
                ["Gender", form.values.gender === "male" ? "Boy" : "Girl"],
                [
                  "School year",
                  form.values.isHomeschooled ? "Taught at home" : form.values.schoolYearGroup,
                ],
                [
                  "Arabic level",
                  proficiencyLabels[
                    form.values.arabicProficiency as keyof typeof proficiencyLabels
                  ],
                ],
                ["Allergies", form.values.allergies.join(", ") || "None"],
                ["Medical", form.values.medicalNotes || "None"],
                ["Notes", form.values.applicationNotes || "None"],
                ["Preferred day", day?.label ?? "Any day"],
                [
                  "Preferred class",
                  day?.classes.find((c) => c.id === form.values.preferredClassId)?.name ??
                    "No preference",
                ],
              ]}
            />
            <Review
              title="You"
              rows={[
                [
                  "Relationship",
                  relationshipLabels[form.values.relationship as keyof typeof relationshipLabels],
                ],
                [
                  "Address",
                  [
                    form.values.addressLine1,
                    form.values.addressLine2,
                    form.values.city,
                    form.values.postalCode,
                  ]
                    .filter(Boolean)
                    .join(", "),
                ],
                [
                  "Emergency contact",
                  `${form.values.emergencyContactName} (${form.values.emergencyContactRelationship}) · ${form.values.emergencyContactPhone}`,
                ],
              ]}
            />
            <FormError message={error} />
          </Stack>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between">
        <Button variant="default" onClick={() => setStep(step - 1)} disabled={step === 0}>
          Back
        </Button>
        {step < 3 ? (
          <Button onClick={next}>Continue</Button>
        ) : (
          <Button onClick={submit} loading={saving}>
            Send application
          </Button>
        )}
      </Group>
    </Stack>
  );
}

// Labels hide on phones so four steps fit on one row.
function StepLabel({ children }: { children: string }) {
  return (
    <Box component="span" visibleFrom="xs">
      {children}
    </Box>
  );
}

function Review({ title, rows }: { title: string; rows: [string, string | null | undefined][] }) {
  return (
    <Card>
      <Title order={3} mb="sm">
        {title}
      </Title>
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs" verticalSpacing="xs">
        {rows.map(([label, value]) => (
          <Field key={label} label={label} value={value} />
        ))}
      </SimpleGrid>
    </Card>
  );
}
