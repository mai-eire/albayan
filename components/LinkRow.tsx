"use client";

import { Table, type TableTrProps } from "@mantine/core";
import { useRouter } from "next/navigation";
import classes from "./LinkRow.module.css";

// A table row that opens a page when clicked anywhere on it (§4.5). Keep a real link in the
// first cell for keyboard users and the address bar; clicks on links and buttons inside the
// row do their own thing.
export function LinkRow({ href, children, ...props }: TableTrProps & { href: string }) {
  const router = useRouter();
  return (
    <Table.Tr
      {...props}
      className={classes.row}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button, input, [role=menu]")) return;
        router.push(href);
      }}
    >
      {children}
    </Table.Tr>
  );
}
