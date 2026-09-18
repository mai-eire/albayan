"use client";

import { Button } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useSearchParams } from "next/navigation";

// "Export CSV" for a filtered list: the download carries the page's current filters, so
// what you see is what you get. Defaults the page chose (the year, say) go in `href`; the
// URL's filters are laid over them. A client component because the filters are in the URL.
export function ExportButton({ href }: { href: string }) {
  const params = useSearchParams();
  const [path, defaults] = href.split("?");
  const query = new URLSearchParams(defaults);
  params.forEach((value, key) => query.set(key, value));
  const q = query.toString();
  return (
    <Button
      component="a"
      href={q ? `${path}?${q}` : path}
      variant="light"
      leftSection={<IconDownload size={16} stroke={1.75} />}
    >
      Export CSV
    </Button>
  );
}
