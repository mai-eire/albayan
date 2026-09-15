import { sql } from "drizzle-orm";
import { customType, integer, text } from "drizzle-orm/sqlite-core";

// Timestamps are UTC ISO strings (CLAUDE.md). Our tables read and write them as strings.
export const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const timestamps = {
  createdAt: text().notNull().default(nowIso),
  updatedAt: text().notNull().default(nowIso),
};

// Better Auth reads and writes Date objects; this stores them as the same ISO text.
export const isoDate = customType<{ data: Date; driverData: string }>({
  dataType: () => "text",
  toDriver: (value) => value.toISOString(),
  fromDriver: (value) => new Date(value),
});

export const bool = () => integer({ mode: "boolean" });

// Lists are JSON text (SQLite has no arrays).
export const jsonList = <T extends string = string>() =>
  text({ mode: "json" })
    .$type<T[]>()
    .notNull()
    .default(sql`'[]'`);
