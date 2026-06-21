/**
 * Mini month calendar, hand-rolled to stay strictly monochrome.
 * Avoids react-day-picker so default blue accents + slider footer can't
 * leak through.
 */
"use client";

import { addMonths, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

const WEEK_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

interface MiniCalendarProps {
  value: Date;
  onChange: (next: Date) => void;
}

export function MiniCalendar({ value, onChange }: MiniCalendarProps) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value));
  const today = new Date();

  const days = useMemo(() => {
    const start = startOfWeek(viewMonth, { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(d);
    }
    return out;
  }, [viewMonth]);

  return (
    <div className="space-y-2 px-1 pt-1">
      <header className="flex items-center justify-between px-1">
        <div className="text-sm font-semibold tracking-tight">{format(viewMonth, "MMMM yyyy")}</div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setViewMonth((m) => addMonths(m, -1))}
            aria-label="Previous month"
            className="hover:bg-accent text-muted-foreground hover:text-foreground grid size-6 place-items-center rounded"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
            className="hover:bg-accent text-muted-foreground hover:text-foreground grid size-6 place-items-center rounded"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-y-0.5 px-1">
        {WEEK_LABELS.map((l) => (
          <div
            key={l}
            className="text-muted-foreground text-center text-[10px] font-medium tracking-wider uppercase"
          >
            {l}
          </div>
        ))}
        {days.map((d) => {
          const inMonth = isSameMonth(d, viewMonth);
          const isToday = isSameDay(d, today);
          const isSelected = isSameDay(d, value);
          return (
            <button
              key={d.toISOString()}
              onClick={() => {
                onChange(d);
                setViewMonth(startOfMonth(d));
              }}
              className={`grid h-7 w-full place-items-center rounded text-xs transition-colors ${
                isSelected
                  ? "bg-foreground text-background font-semibold"
                  : isToday
                    ? "ring-foreground/40 hover:bg-accent ring-1 ring-inset"
                    : inMonth
                      ? "hover:bg-accent text-foreground"
                      : "text-muted-foreground/40 hover:bg-accent"
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
