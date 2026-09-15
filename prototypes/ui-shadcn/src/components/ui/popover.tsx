import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
function PopoverContent({ className, align = "start", ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content align={align} sideOffset={6} className={cn("z-50 rounded-xl border border-border bg-popover p-3 shadow-md outline-none", className)} {...props} />
    </PopoverPrimitive.Portal>
  );
}
export { Popover, PopoverTrigger, PopoverContent };
