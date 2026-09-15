import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" className={cn("flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm placeholder:text-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...props} />;
}
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn("flex min-h-20 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm placeholder:text-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...props} />;
}
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label data-slot="label" className={cn("mb-1.5 block text-sm font-semibold", className)} {...props} />;
}
export { Input, Textarea, Label };
