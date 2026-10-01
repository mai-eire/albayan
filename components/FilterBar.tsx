import type { ReactNode } from "react";
import classes from "./FilterBar.module.css";

// The filters above a staff table, and the count at their end (DESIGN §4.5). One wrapping
// row on a desktop; on a phone a grid, the first filter (the search) across the whole
// width and the rest two to a row.
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className={classes.bar}>{children}</div>;
}
