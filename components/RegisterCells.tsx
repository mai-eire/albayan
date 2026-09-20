import { TableTd, Text } from "@mantine/core";
import { Nothing } from "@/components/Nothing";
import { StatusBadge } from "@/components/StatusBadge";
import tabular from "@/components/tabular.module.css";
import classes from "./RegisterCells.module.css";

type Counts = {
  studentCount: number;
  recordedCount: number;
  absentCount: number;
  excusedCount: number;
};

export const isTaken = (r: Counts) => r.studentCount > 0 && r.recordedCount >= r.studentCount;

// "7 / 8" once the register is in, "? / 8" until then — the same cell in both views, with
// the "/" in the same place on every row. Excused counts as not present. An empty class
// has nothing to count.
export function PresentCell({ r }: { r: Counts }) {
  if (r.studentCount === 0) {
    return (
      <TableTd ta="end">
        <Nothing>no students</Nothing>
      </TableTd>
    );
  }
  return (
    <TableTd ta="end" className={tabular.tabular}>
      <span className={classes.left}>
        {r.recordedCount ? (
          <Text component="span" c={r.absentCount + r.excusedCount ? "clay" : undefined} fw={500}>
            {r.recordedCount - r.absentCount - r.excusedCount}
          </Text>
        ) : (
          <Text component="span" c="dimmed">
            ?
          </Text>
        )}
      </span>
      <Text component="span" c="dimmed" className={classes.slash}>
        /
      </Text>
      <Text component="span" c="dimmed" className={classes.right}>
        {r.studentCount}
      </Text>
    </TableTd>
  );
}

export function RegisterCell({ r }: { r: Counts }) {
  return (
    <TableTd>
      {r.studentCount === 0 ? (
        <Nothing>nothing to take</Nothing>
      ) : isTaken(r) ? (
        <StatusBadge domain="register" value="taken" />
      ) : (
        <StatusBadge domain="register" value="missing" />
      )}
    </TableTd>
  );
}
