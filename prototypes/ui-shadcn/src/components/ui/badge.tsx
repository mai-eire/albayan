import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold", {
  variants: {
    variant: {
      tile: "bg-tile-50 text-tile-800", lapis: "bg-lapis-50 text-lapis-800", plum: "bg-plum-50 text-plum-800",
      saffron: "bg-saffron-50 text-saffron-800", clay: "bg-clay-50 text-clay-800", muted: "bg-ground text-muted",
      "saffron-solid": "bg-saffron-500 text-ink", "tile-solid": "bg-tile-600 text-white", "lapis-solid": "bg-lapis-600 text-white",
      "plum-solid": "bg-plum-600 text-white", outline: "border border-border text-muted",
    },
  },
  defaultVariants: { variant: "muted" },
});

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
export { Badge };
