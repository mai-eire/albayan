import { Card, SimpleGrid, Stack, Text } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { Field } from "@/components/Field";
import { DateText } from "@/components/DateText";
import { MoneyText } from "@/components/MoneyText";
import { countEnrolledSiblings } from "@/lib/db/queries/students";
import { EditFeeButton } from "./EditFeeButton";
import { loadStudent } from "../load";

type Props = { params: Promise<{ id: string }> };

export default async function StudentEnrolmentPage({ params }: Props) {
  const student = await loadStudent(params);
  const e = student.enrolment;
  const siblings = e ? await countEnrolledSiblings(student.id) : 0;
  return (
    <Stack gap="lg">
      <Card>
        <CardTitle
          context={
            e && (
              <EditFeeButton
                enrolmentId={e.id}
                feeCents={e.feeCents}
                feeNote={e.feeNote}
                siblings={siblings}
              />
            )
          }
        >
          {e ? `Place for ${e.academicYearId}` : "No place yet"}
        </CardTitle>
        {e ? (
          <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="md">
            <Field label="Class" value={e.className} />
            <Field label="Day" value={e.sessionName} />
            <Field label="Since" value={<DateText date={e.startDate} withYear />} />
            <Field
              label="Fee"
              value={
                <>
                  <MoneyText cents={e.feeCents} />
                  {e.feeNote && (
                    <Text size="sm" c="dimmed" component="span">
                      {" "}
                      · {e.feeNote}
                    </Text>
                  )}
                </>
              }
            />
          </SimpleGrid>
        ) : (
          <Text size="sm" c="dimmed">
            {student.status === "applied"
              ? "Waiting for a decision on the application."
              : "This student isn't placed in a class."}
          </Text>
        )}
      </Card>
      <Card>
        <CardTitle>Application</CardTitle>
        <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="md">
          <Field label="Applied" value={<DateText date={student.appliedAt} withYear />} />
          <Field label="Preferred day" value={student.preferredSessionName ?? "—"} />
          <Field label="Preferred class" value={student.preferredClassName ?? "No preference"} />
          <Field
            label="Decided"
            value={student.approvedAt ? <DateText date={student.approvedAt} withYear /> : "—"}
          />
        </SimpleGrid>
        {student.applicationNotes && (
          <Text size="sm" mt="md">
            From the family: {student.applicationNotes}
          </Text>
        )}
        {student.declinedReason && (
          <Text size="sm" mt="md">
            Declined: {student.declinedReason}
          </Text>
        )}
      </Card>
    </Stack>
  );
}
