import { formatEuros } from "./money";

// CSV downloads for the office's lists: one function so quoting and the download headers
// are the same everywhere. Route handlers check access themselves — layouts don't guard them.
export function csvResponse(filename: string, rows: string[][]): Response {
  const body = rows.map((row) => row.map(cell).join(",")).join("\r\n");
  return new Response(`﻿${body}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}

function cell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Plain numbers so spreadsheets add them up; "€" and thousands separators would stop that.
export function plainEuros(cents: number): string {
  return formatEuros(cents).replace(/[€,]/g, "").replace("−", "-");
}
