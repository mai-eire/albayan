import { getCurrentUser } from "@/lib/current-user";
import { csvResponse } from "@/lib/csv";
import { getCurrentYear } from "@/lib/db/queries/academics";
import { listStaff } from "@/lib/db/queries/staff";
import { applyStaffFilters, parseStaffFilters } from "../filters";

// The staff list as a spreadsheet, filtered the way the page is.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Forbidden", { status: 403 });
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const year = await getCurrentYear();
  const rows = applyStaffFilters(await listStaff(year?.id ?? null), parseStaffFilters(params));
  return csvResponse("staff.csv", [
    ["Name", "Email", "Phone", "Admin", "Teacher", "Stopped teaching", "Classes", "Account"],
    ...rows.map((s) => [
      s.name,
      s.email,
      s.phone ?? "",
      s.isAdmin ? "yes" : "",
      s.teacher ? (s.teacher.isActive ? "yes" : "former") : "",
      s.teacher?.deactivatedAt?.slice(0, 10) ?? "",
      s.classes
        .map(
          (c) =>
            `${c.name} (${c.sessionName}${c.subjects.length ? `: ${c.subjects.join(", ")}` : ""})`,
        )
        .join("; "),
      s.status,
    ]),
  ]);
}
