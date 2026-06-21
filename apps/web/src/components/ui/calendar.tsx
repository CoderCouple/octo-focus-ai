"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * shadcn Calendar primitive — react-day-picker v10 with strictly monochrome
 * theming. The default stylesheet ships blue accents and a footer slider; we
 * skip it entirely and drive every element via classNames + components.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2 text-xs", className)}
      classNames={{
        ...defaults,
        months: "flex flex-col gap-2",
        month: "flex flex-col gap-2",
        month_caption: "flex items-center justify-between pt-1 px-1",
        caption_label: "text-sm font-semibold tracking-tight",
        nav: "flex items-center gap-0.5",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-6 bg-transparent text-muted-foreground hover:text-foreground opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-6 bg-transparent text-muted-foreground hover:text-foreground opacity-100",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "grid grid-cols-7",
        weekday:
          "text-muted-foreground text-[10px] font-medium uppercase tracking-wider text-center",
        week: "grid grid-cols-7 mt-0.5",
        day: "size-7 p-0 text-center",
        day_button: cn(
          "size-7 p-0 text-xs font-normal rounded-md transition-colors",
          "hover:bg-accent text-foreground",
          // Override library defaults so weekends don't go blue.
          "[&[data-selected-single=true]]:bg-foreground [&[data-selected-single=true]]:text-background [&[data-selected-single=true]]:font-semibold",
          "[&[data-today=true]:not([data-selected-single=true])]:ring-1 [&[data-today=true]:not([data-selected-single=true])]:ring-inset [&[data-today=true]:not([data-selected-single=true])]:ring-foreground/40",
          "[&[data-outside=true]]:text-muted-foreground/40",
          "[&[data-disabled=true]]:opacity-30",
        ),
        // Nuke any cached "selected" / "today" container styles too.
        selected: "",
        today: "",
        outside: "",
        disabled: "",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
