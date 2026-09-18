import { getCurrentUser } from "@/lib/current-user";
import { csvResponse } from "@/lib/csv";
import { listStudentsForAdmin } from "@/lib/db/queries/students";
import { applyStudentFilters, parseStudentFilters } from "../filters";

// The students list as a spreadsheet, filtered the way the page is.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Forbidden", { status: 403 });
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const rows = applyStudentFilters(await listStudentsForAdmin(), parseStudentFilters(params));
  return csvResponse("students.csv", [
    [
      "Student ID",
      "First name",
      "Surname",
      "Date of birth",
      "Status",
      "Class",
      "Session",
      "Guardian",
      "Guardian email",
      "Guardian phone",
    ],
    ...rows.map((s) => [
      s.studentId ?? "",
      s.firstName,
      s.lastName,
      s.dateOfBirth,
      s.status,
      s.className ?? "",
      s.sessionName ?? "",
      s.guardianName ?? "",
      s.guardianEmail ?? "",
      s.guardianPhone ?? "",
    ]),
  ]);
}
