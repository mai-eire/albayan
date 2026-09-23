import { ApplicationCard } from "@/components/ApplicationCard";
import { loadTeacherStudent } from "../load";

type Props = { params: Promise<{ id: string }> };

// How the child came to be here: the facts only. What the family wrote to the office, and
// the reason behind a refusal, stay with the office.
export default async function TeacherStudentApplicationPage({ params }: Props) {
  const { student } = await loadTeacherStudent(params);
  return (
    <ApplicationCard
      application={{
        ...student.application,
        schoolYearGroup: student.schoolYearGroup,
        isHomeschooled: student.isHomeschooled,
        arabicProficiency: student.arabicProficiency,
        placedClassName: student.className,
        placedSessionName: student.sessionName,
        offerNote: null,
      }}
    />
  );
}
