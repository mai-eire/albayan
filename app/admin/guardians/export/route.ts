import { getCurrentUser } from "@/lib/current-user";
import { csvResponse } from "@/lib/csv";
import { getCurrentYear, listClasses } from "@/lib/db/queries/academics";
import { listGuardiansForAdmin } from "@/lib/db/queries/students";
import { relationshipLabels } from "@/lib/demographics";
import { applyFamilyFilters, familiesFrom, parseFamilyFilters } from "../filters";

// The families list as a spreadsheet, one line per guardian, filtered the way the page is.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Forbidden", { status: 403 });
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const [guardians, year] = await Promise.all([listGuardiansForAdmin(), getCurrentYear()]);
  const classes = year ? await listClasses(year.id) : [];
  const families = applyFamilyFilters(familiesFrom(guardians), parseFamilyFilters(params), classes);
  return csvResponse("families.csv", [
    ["Family", "Guardian", "Relationship", "Email", "Phone", "Children"],
    ...families.flatMap((f) =>
      f.guardians.map((g) => [
        f.name,
        g.name,
        g.relationship ? relationshipLabels[g.relationship as keyof typeof relationshipLabels] : "",
        g.email,
        g.phone ?? "",
        g.children
          .map((c) => `${c.firstName} ${c.lastName}${c.className ? ` (${c.className})` : ""}`)
          .join("; "),
      ]),
    ),
  ]);
}
