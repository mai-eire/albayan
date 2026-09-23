import { notFound } from "next/navigation";
import { ApplicationCard } from "@/components/ApplicationCard";
import { listApplications } from "@/lib/db/queries/applications";

type Props = { params: Promise<{ id: string }> };

// The application as it was made, and what the office decided.
export default async function StudentApplicationPage({ params }: Props) {
  const id = Number((await params).id);
  const [application] = await listApplications({ onlyIds: [id] });
  if (!application) notFound();
  return (
    <ApplicationCard
      application={{
        status: application.status,
        appliedAt: application.appliedAt,
        decidedAt: application.decidedAt,
        academicYearId: application.applicationYearId,
        schoolYearGroup: application.schoolYearGroup,
        arabicProficiency: application.arabicProficiency,
        preferredSessionName: application.preferredSessionName,
        preferredClassName: application.preferredClassName,
        placedClassName: application.placedClassName,
        placedSessionName: application.placedSessionName,
        offerNote: application.offerNote,
        applicationNotes: application.applicationNotes,
        declinedReason: application.declinedReason,
      }}
    />
  );
}
