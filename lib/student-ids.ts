import { like, sql } from "drizzle-orm";
import type { Db } from "./db";
import { students } from "./db/schema";

// "ALB-26-0042": prefix, two-digit start year, then a per-year sequence with no gaps
// (the next number is one more than the highest issued). students.studentId is unique.
export async function nextStudentId(db: Db, prefix: string, academicYearId: string) {
  const stem = `${prefix}-${academicYearId.slice(2, 4)}-`;
  const [row] = await db
    .select({ max: sql<string | null>`max(${students.studentId})` })
    .from(students)
    .where(like(students.studentId, `${stem}%`));
  const last = row?.max ? Number(row.max.slice(stem.length)) : 0;
  return `${stem}${String(last + 1).padStart(4, "0")}`;
}
