import { getCurrentUser } from "@/lib/current-user";
import { listFeeAccounts } from "@/lib/db/queries/fees";
import { formatEuros } from "@/lib/money";
import { applyFeeFilters, parseFeeFilters } from "../filters";

// The fees list as a spreadsheet, with the same filters the page shows. A read, so a route
// handler is fine; it checks access itself because layouts don't guard route handlers.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Forbidden", { status: 403 });
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const year = params.year;
  if (!year) return new Response("Missing year", { status: 400 });
  const rows = applyFeeFilters(await listFeeAccounts(year), parseFeeFilters(params));
  const lines = [
    [
      "Student ID",
      "Student",
      "Class",
      "Day",
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
      euros(a.feeCents),
      e.feeNote ?? "",
      euros(a.paidCents),
      euros(a.balanceCents),
      a.status.replace("_", " "),
    ]),
  ];
  return new Response(lines.map((l) => l.map(cell).join(",")).join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="fees-${year}.csv"`,
    },
  });
}

// Plain numbers so spreadsheets add them up; "€" and thousands separators would stop that.
function euros(cents: number) {
  return formatEuros(cents).replace(/[€,]/g, "").replace("−", "-");
}

function cell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
