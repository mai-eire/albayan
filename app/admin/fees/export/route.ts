import { getCurrentUser } from "@/lib/current-user";
import { csvResponse, plainEuros } from "@/lib/csv";
import { listFeeAccounts } from "@/lib/db/queries/fees";
import { applyFeeFilters, parseFeeFilters } from "../filters";

// The fees list as a spreadsheet, with the same filters the page shows.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Forbidden", { status: 403 });
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const year = params.year;
  if (!year) return new Response("Missing year", { status: 400 });
  const rows = applyFeeFilters(await listFeeAccounts(year), parseFeeFilters(params));
  return csvResponse(`fees-${year}.csv`, [
    [
      "Student ID",
      "Student",
      "Class",
      "Session",
      "Guardian",
      "Fee",
      "Fee note",
      "Paid",
      "Balance",
      "Status",
    ],
    ...rows.map(({ enrolment: e, ...a }) => [
      e.studentCode ?? "",
      `${e.firstName} ${e.lastName}`,
      e.className,
      e.sessionName,
      e.guardianName ?? "",
      plainEuros(a.feeCents),
      e.feeNote ?? "",
      plainEuros(a.paidCents),
      plainEuros(a.balanceCents),
      a.status.replace("_", " "),
    ]),
  ]);
}
