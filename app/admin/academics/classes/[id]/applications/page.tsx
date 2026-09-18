import {
  Card,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import { LinkButton } from "@/components/LinkButton";
import { DateText } from "@/components/DateText";
import { OfferPlaceButton } from "@/app/admin/applications/OfferPlaceButton";
import { ageOn } from "@/lib/age";
import { classChoice, getYear, listClasses } from "@/lib/db/queries/academics";
import { listApplications, listApplicationsForClass } from "@/lib/db/queries/applications";
import { familyOverviewFor } from "@/lib/db/queries/families";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { todayIn } from "@/lib/time";
import { loadClass } from "../load";

type Props = { params: Promise<{ id: string }> };

// Who is waiting for a place here: children who asked for this class by name. Decisions
// are made from the inbox or right here.
export default async function ClassApplicationsPage({ params }: Props) {
  const cls = await loadClass(params);
  const [applications, { timezone }, allClasses, year] = await Promise.all([
    listApplicationsForClass(cls.id),
    getSchoolSettings(),
    listClasses(cls.academicYearId),
    getYear(cls.academicYearId),
  ]);
  const ids = applications.map((a) => a.id);
  const [full, families] = await Promise.all([
    listApplications(ids),
    familyOverviewFor(ids, cls.academicYearId),
  ]);
  const today = todayIn(timezone);
  const choices = allClasses.map(classChoice);
  const places =
    cls.capacity === null
      ? `${cls.studentCount} placed`
      : `${cls.studentCount} of ${cls.capacity} places taken`;
  return (
    <Card>
      <CardTitle
        context={
          applications.length > 0 && (
            <LinkButton href="/admin/applications" variant="light" size="xs">
              Open the inbox
            </LinkButton>
          )
        }
      >
        Applications
        <Text component="span" c="dimmed" fw={400}>
          {" "}
          {applications.length}
        </Text>
      </CardTitle>
      <Text size="sm" c="dimmed" mb="md">
        {places}.
      </Text>
      {applications.length === 0 ? (
        <Text size="sm" c="dimmed">
          Nobody is waiting for {cls.name}.
        </Text>
      ) : (
        <Table>
          <TableThead>
            <TableTr>
              <TableTh>Child</TableTh>
              <TableTh ta="end">Age</TableTh>
              <TableTh>Guardian</TableTh>
              <TableTh>Applied</TableTh>
              <TableTh />
            </TableTr>
          </TableThead>
          <TableTbody>
            {applications.map((a) => (
              <TableTr key={a.id}>
                <TableTd>
                  <AppLink href={`/admin/students/${a.id}`} fw={500}>
                    {a.firstName} {a.lastName}
                  </AppLink>
                </TableTd>
                <TableTd ta="end">{ageOn(a.dateOfBirth, today)}</TableTd>
                <TableTd>{a.guardianName}</TableTd>
                <TableTd>
                  <DateText date={a.appliedAt} />
                </TableTd>
                <TableTd ta="end">
                  {full.find((f) => f.id === a.id) && (
                    <OfferPlaceButton
                      application={full.find((f) => f.id === a.id)!}
                      classes={choices}
                      family={families.get(a.id) ?? []}
                      standardFeeCents={year?.standardFeeCents ?? 0}
                      today={today}
                      size="xs"
                      variant="light"
                    />
                  )}
                </TableTd>
              </TableTr>
            ))}
          </TableTbody>
        </Table>
      )}
    </Card>
  );
}
