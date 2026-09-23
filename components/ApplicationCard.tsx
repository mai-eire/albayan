import { Alert, Card, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import dayjs from "dayjs";
import { CardTitle } from "./CardTitle";
import { Field } from "./Field";
import { StatusBadge } from "./StatusBadge";
import { proficiencyLabels, schoolYearLabel } from "@/lib/demographics";
import type { ArabicProficiency } from "@/lib/db/schema";

// What a family asked for and what became of it. The same card for the office, the family
// and the teacher; the teacher's copy simply carries no notes and no reason (the family
// tells the office things it doesn't tell the classroom).
export type ApplicationView = {
  status: "applied" | "accepted" | "declined";
  appliedAt: string;
  decidedAt: string | null;
  academicYearId: string | null;
  schoolYearGroup: string | null;
  isHomeschooled: boolean;
  arabicProficiency: ArabicProficiency;
  preferredSessionName: string | null;
  preferredClassName: string | null;
  placedClassName: string | null;
  placedSessionName: string | null;
  offerNote: string | null;
  // Left out of the teacher's copy.
  applicationNotes?: string | null;
  declinedReason?: string | null;
};

export function ApplicationCard({
  application: a,
  title = "Application",
  action,
}: {
  application: ApplicationView;
  title?: string;
  // "Edit" for a family whose application is still waiting.
  action?: ReactNode;
}) {
  const date = (value: string | null) => (value ? dayjs(value).format("D MMM YYYY") : null);
  return (
    <Card>
      <CardTitle context={action}>
        {title}
        <Text component="span" fw={400} ms="xs">
          <StatusBadge domain="decision" value={a.status} />
        </Text>
      </CardTitle>
      <Stack gap="md">
        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md" verticalSpacing="sm">
          <Field label="Applied" value={date(a.appliedAt)} />
          <Field label="For the year" value={a.academicYearId} />
          <Field
            label={a.status === "declined" ? "Declined" : "Accepted"}
            value={date(a.decidedAt)}
          />
          <Field label="Session asked for" value={a.preferredSessionName ?? "No preference"} />
          <Field label="Class asked for" value={a.preferredClassName ?? "No preference"} />
          <Field
            label="School year then"
            value={schoolYearLabel(a.schoolYearGroup, a.isHomeschooled)}
          />
          <Field label="Arabic then" value={proficiencyLabels[a.arabicProficiency]} />
          {a.placedClassName && (
            <Field
              label="Placed in"
              value={`${a.placedClassName}${a.placedSessionName ? ` · ${a.placedSessionName}` : ""}`}
            />
          )}
        </SimpleGrid>
        {a.applicationNotes && (
          <Stack gap={4}>
            <Title order={4}>From the family</Title>
            <Text size="sm">{a.applicationNotes}</Text>
          </Stack>
        )}
        {a.offerNote && (
          <Stack gap={4}>
            <Title order={4}>Note with the offer</Title>
            <Text size="sm">{a.offerNote}</Text>
          </Stack>
        )}
        {a.declinedReason && (
          <Alert color="clay" variant="light" title="Why it was declined">
            {a.declinedReason}
          </Alert>
        )}
      </Stack>
    </Card>
  );
}
