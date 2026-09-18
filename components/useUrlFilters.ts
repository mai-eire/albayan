"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

// List filters live in the URL (DESIGN §4.5) so a view can be shared and survives a
// refresh — but the rows are already in the browser, so changing a filter must not go back
// to the server. replaceState keeps Next's useSearchParams in step without a navigation;
// the table re-filters in place and CSV exports read the same parameters.
export function useUrlFilters() {
  const params = useSearchParams();
  const set = useCallback((changes: Record<string, string | null | undefined>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
    );
  }, []);
  return { params, set, query: Object.fromEntries(params) as Record<string, string> };
}
