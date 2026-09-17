"use client";

import {
  Button,
  Card,
  Checkbox,
  Group,
  Select,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CardTitle } from "@/components/CardTitle";
import { FormError } from "@/components/FormError";
import { sensitiveExplanation } from "@/components/SensitiveSection";
import { toast } from "@/components/toast";
import type { guardians } from "@/lib/db/schema";
import { registrationReasons } from "@/lib/db/schema";
import {
  commonLanguages,
  ethnicities,
  guardianGenderOptions,
  preferNotToSay,
  reasonLabels,
} from "@/lib/demographics";
import { updateAccount, type AccountInput } from "./actions";

type Props = {
  user: { name: string; phone: string | null; emailNotifications: boolean };
  guardian: typeof guardians.$inferSelect | null;
};

export function AccountForm({ user, guardian }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<AccountInput>({
    initialValues: {
      name: user.name,
      phone: user.phone ?? "",
      gender: guardian?.gender ?? null,
      emailNotifications: user.emailNotifications,
      addressLine1: guardian?.addressLine1 ?? "",
      addressLine2: guardian?.addressLine2 ?? "",
      city: guardian?.city ?? "",
      postalCode: guardian?.postalCode ?? "",
      emergencyContactName: guardian?.emergencyContactName ?? "",
      emergencyContactPhone: guardian?.emergencyContactPhone ?? "",
      emergencyContactRelationship: guardian?.emergencyContactRelationship ?? "",
      ethnicity: guardian?.ethnicity ?? "",
      spokenLanguages: guardian?.spokenLanguages ?? [],
      registrationReasons: guardian?.registrationReasons ?? [],
      registrationReasonOther: guardian?.registrationReasonOther ?? "",
    },
  });

  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const result = await updateAccount(values);
    setSaving(false);
    if (!result.ok) {
      if (result.fieldErrors) form.setErrors(result.fieldErrors);
      setError(result.error);
      return;
    }
    toast.success("Account saved");
    form.resetDirty(values);
    router.refresh();
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="lg">
        <Card>
          <CardTitle>You</CardTitle>
          <Stack gap="md">
            <Group grow>
              <TextInput label="Name" withAsterisk {...form.getInputProps("name")} />
              <TextInput label="Phone" type="tel" withAsterisk {...form.getInputProps("phone")} />
            </Group>
            <Select
              label="Gender"
              placeholder="Prefer not to say"
              data={guardianGenderOptions}
              clearable
              maw={240}
              {...form.getInputProps("gender")}
            />
            <TextInput label="Address" {...form.getInputProps("addressLine1")} />
            <TextInput label="Address line 2" {...form.getInputProps("addressLine2")} />
            <Group grow>
              <TextInput label="Town or city" {...form.getInputProps("city")} />
              <TextInput label="Eircode" {...form.getInputProps("postalCode")} />
            </Group>
            <Switch
              label="Email me when something happens"
              description="Homework, notes and school news. You'll always see them here."
              {...form.getInputProps("emailNotifications", { type: "checkbox" })}
            />
          </Stack>
        </Card>
        <Card>
          <CardTitle>Emergency contact</CardTitle>
          <Stack gap="md">
            <TextInput label="Name" {...form.getInputProps("emergencyContactName")} />
            <Group grow>
              <TextInput
                label="Phone"
                type="tel"
                {...form.getInputProps("emergencyContactPhone")}
              />
              <TextInput
                label="Relationship to your children"
                {...form.getInputProps("emergencyContactRelationship")}
              />
            </Group>
          </Stack>
        </Card>
        <Card>
          <CardTitle>About your family</CardTitle>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {sensitiveExplanation}
            </Text>
            <Select
              label="Your ethnicity"
              data={[...ethnicities, preferNotToSay]}
              value={form.values.ethnicity || preferNotToSay}
              onChange={(v) =>
                form.setFieldValue("ethnicity", v === preferNotToSay ? "" : (v ?? ""))
              }
              allowDeselect={false}
            />
            <TagsInput
              label="Languages spoken at home"
              data={commonLanguages}
              maxTags={10}
              {...form.getInputProps("spokenLanguages")}
            />
            <Checkbox.Group
              label="Why you registered with us"
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
        </Card>
        <FormError message={error} />
        <Group justify="flex-end">
          <Button type="submit" loading={saving} disabled={!form.isDirty()}>
            Save changes
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
