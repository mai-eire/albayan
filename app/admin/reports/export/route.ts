import { clock } from "@/lib/clock";
import { csvResponse } from "@/lib/csv";
import { getCurrentUser } from "@/lib/current-user";
import { reportData } from "@/lib/db/queries/reports";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { reports } from "@/lib/reports";
import { todayIn } from "@/lib/time";

// Every report of the year as one spreadsheet — the page's charts, row by row, in the same
// order and the same words.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Forbidden", { status: 403 });
  const year = new URL(request.url).searchParams.get("year");
  if (!year) return new Response("Missing year", { status: 400 });
  const { timezone } = await getSchoolSettings();
  const charts = reports(await reportData(year), todayIn(timezone, await clock()));
  return csvResponse(`reports-${year}.csv`, [
    ["Report", "Group", "Children"],
    ...charts.flatMap((chart) =>
      chart.data.map((row) => [chart.title, row.label, String(row.count)]),
    ),
  ]);
}
