import { DayPicker, type DayPickerProps } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// react-day-picker v9 styled with Tailwind classes, as shadcn's calendar does.
function Calendar({ className, classNames, ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays
      weekStartsOn={1}
      className={cn("p-1", className)}
      classNames={{
        months: "flex flex-col",
        month: "space-y-3",
        month_caption: "flex h-8 items-center justify-center font-display text-sm font-bold",
        nav: "absolute inset-x-1 flex items-center justify-between",
        button_previous: "size-7 inline-flex items-center justify-center rounded-md hover:bg-accent",
        button_next: "size-7 inline-flex items-center justify-center rounded-md hover:bg-accent",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 text-[0.7rem] font-semibold uppercase text-muted",
        week: "mt-1 flex",
        day: "size-8 p-0 text-center text-sm",
        day_button: "size-8 rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected: "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
        today: "font-bold text-tile-700",
        outside: "text-muted/50",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => (orientation === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />),
      }}
      {...props}
    />
  );
}
export { Calendar };
