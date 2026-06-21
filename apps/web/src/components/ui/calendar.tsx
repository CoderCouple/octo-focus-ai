"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays
      className={cn(
        // react-day-picker v10 uses CSS custom properties for its theming hooks.
        "[--rdp-accent-color:var(--foreground)]",
        "[--rdp-accent-background-color:var(--accent)]",
        "[--rdp-day-height:1.75rem]",
        "[--rdp-day-width:1.75rem]",
        "[--rdp-day_button-height:1.75rem]",
        "[--rdp-day_button-width:1.75rem]",
        "text-xs",
        className,
      )}
      {...props}
    />
  );
}

export { Calendar };
