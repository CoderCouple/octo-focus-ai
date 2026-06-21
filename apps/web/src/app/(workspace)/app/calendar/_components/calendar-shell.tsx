/**
 * Notion-Calendar-style three-pane shell. Strictly monochrome per brand rule.
 *
 *   Left  — mini month + connected calendars (with toggle)
 *   Center — header with Day/Week/Month/Year view switcher + the chosen view
 *   Right — search, scheduling snippet, quick actions, keyboard shortcuts
 *
 * Data is mocked for now; real wiring will land alongside Phase A (schema +
 * Google OAuth).
 */
"use client";

import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isSameYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Share2,
  UserPlus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MiniCalendar } from "./mini-calendar";

type ViewMode = "day" | "week" | "month" | "year";

interface MockAccount {
  email: string;
  label: string;
  accounts: Array<{ id: string; name: string }>;
}

interface MockEvent {
  id: string;
  accountId: string;
  title: string;
  start: Date;
  end: Date;
  subtitle?: string;
}

const MOCK_ACCOUNTS: MockAccount[] = [
  {
    email: "you@octofocus.ai",
    label: "Work",
    accounts: [
      { id: "work", name: "Work" },
      { id: "team", name: "Team meetings" },
      { id: "core", name: "Engineering core" },
    ],
  },
  {
    email: "you@gmail.com",
    label: "Personal",
    accounts: [
      { id: "personal", name: "Personal" },
      { id: "family", name: "Family" },
      { id: "holidays", name: "Holidays" },
    ],
  },
];

function makeEvent(
  accountId: string,
  title: string,
  day: Date,
  startHour: number,
  endHour: number,
  subtitle?: string,
): MockEvent {
  const start = new Date(day);
  start.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);
  const end = new Date(day);
  end.setHours(Math.floor(endHour), (endHour % 1) * 60, 0, 0);
  return { id: `${accountId}-${title}-${day.toISOString()}`, accountId, title, start, end, subtitle };
}

function generateMockEvents(anchor: Date): MockEvent[] {
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const events: MockEvent[] = [];
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  events.push(makeEvent("work", "Standup", days[0], 9, 9.5, "Daily team sync"));
  events.push(makeEvent("team", "Design review", days[0], 11, 12, "Notes app v2"));
  events.push(makeEvent("personal", "Lunch with Priya", days[0], 13, 14));
  events.push(makeEvent("work", "1:1 with mentor", days[1], 10, 10.5));
  events.push(makeEvent("core", "Sprint planning", days[1], 14, 15, "Q3 backlog"));
  events.push(makeEvent("team", "Customer call", days[2], 11, 12, "Acme renewal"));
  events.push(makeEvent("work", "Deep work", days[2], 14, 16, "Calendar schema"));
  events.push(makeEvent("core", "Engineering review", days[3], 9, 10));
  events.push(makeEvent("personal", "Doctor", days[3], 16, 17));
  events.push(makeEvent("team", "Demo day", days[4], 13, 14, "Show & tell"));
  events.push(makeEvent("family", "Date night", days[4], 19, 21));
  events.push(makeEvent("holidays", "Solstice", addDays(weekStart, 1), 0, 24));
  return events;
}

const ACCOUNT_TINT: Record<string, string> = {
  work: "border-l-foreground/80",
  team: "border-l-foreground/55",
  core: "border-l-foreground/35",
  personal: "border-l-foreground/70",
  family: "border-l-foreground/45",
  holidays: "border-l-foreground/25",
};

const ACCOUNT_DOT: Record<string, string> = {
  work: "bg-foreground",
  team: "bg-foreground/65",
  core: "bg-foreground/40",
  personal: "bg-foreground/80",
  family: "bg-foreground/50",
  holidays: "bg-foreground/25",
};

const HOUR_START = 8;
const HOUR_END = 21;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const ROW_HEIGHT = 56;

function fractionalHour(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

export function CalendarShell() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [mode, setMode] = useState<ViewMode>("week");
  const [activeAccounts, setActiveAccounts] = useState<Set<string>>(
    () => new Set(MOCK_ACCOUNTS.flatMap((g) => g.accounts.map((a) => a.id))),
  );

  const events = useMemo(() => generateMockEvents(selectedDate), [selectedDate]);
  const visibleEvents = useMemo(
    () => events.filter((e) => activeAccounts.has(e.accountId)),
    [events, activeAccounts],
  );

  const toggleAccount = (id: string) => {
    setActiveAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const navigate = (dir: -1 | 1) => {
    setSelectedDate((d) => {
      if (mode === "day") return addDays(d, dir);
      if (mode === "week") return addDays(d, dir * 7);
      if (mode === "month") return addMonths(d, dir);
      return addYears(d, dir);
    });
  };

  return (
    <div className="bg-background flex h-[calc(100vh-3.5rem)]">
      <LeftRail
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        accountGroups={MOCK_ACCOUNTS}
        activeAccounts={activeAccounts}
        onToggleAccount={toggleAccount}
      />
      <main className="flex flex-1 flex-col overflow-hidden border-l">
        <CenterHeader
          selectedDate={selectedDate}
          mode={mode}
          onChangeMode={setMode}
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
          onToday={() => setSelectedDate(new Date())}
        />
        <div className="flex flex-1 overflow-hidden border-t">
          {mode === "day" && <DayView day={selectedDate} events={visibleEvents} />}
          {mode === "week" && (
            <WeekView weekStart={startOfWeek(selectedDate, { weekStartsOn: 1 })} events={visibleEvents} />
          )}
          {mode === "month" && (
            <MonthView month={selectedDate} events={visibleEvents} onPickDay={(d) => { setSelectedDate(d); setMode("day"); }} />
          )}
          {mode === "year" && (
            <YearView year={selectedDate} onPickMonth={(d) => { setSelectedDate(d); setMode("month"); }} />
          )}
        </div>
      </main>
      <RightRail />
    </div>
  );
}

// =============================================================================
// Left rail
// =============================================================================

function LeftRail({
  selectedDate,
  onSelectDate,
  accountGroups,
  activeAccounts,
  onToggleAccount,
}: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  accountGroups: MockAccount[];
  activeAccounts: Set<string>;
  onToggleAccount: (id: string) => void;
}) {
  return (
    <aside className="w-[240px] shrink-0 overflow-y-auto p-3">
      <MiniCalendar value={selectedDate} onChange={onSelectDate} />
      <Separator className="my-3" />
      <div className="space-y-4 px-1">
        {accountGroups.map((group) => (
          <div key={group.email} className="space-y-1.5">
            <div className="text-muted-foreground truncate text-[11px] font-medium">
              {group.email}
            </div>
            <ul className="space-y-0.5">
              {group.accounts.map((acct) => {
                const checked = activeAccounts.has(acct.id);
                return (
                  <li key={acct.id}>
                    <button
                      onClick={() => onToggleAccount(acct.id)}
                      className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors"
                    >
                      <span
                        className={`grid size-3.5 shrink-0 place-items-center rounded-[3px] border ${
                          checked ? "border-foreground/40" : "border-foreground/15"
                        }`}
                      >
                        {checked ? (
                          <span className={`size-2 rounded-[1.5px] ${ACCOUNT_DOT[acct.id] ?? "bg-foreground/40"}`} />
                        ) : null}
                      </span>
                      <span className={checked ? "text-foreground" : "text-muted-foreground"}>
                        {acct.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground w-full justify-start gap-2 px-2 text-xs"
        >
          <Plus className="size-3.5" /> Add calendar
        </Button>
      </div>
    </aside>
  );
}

// =============================================================================
// Center
// =============================================================================

function CenterHeader({
  selectedDate,
  mode,
  onChangeMode,
  onPrev,
  onNext,
  onToday,
}: {
  selectedDate: Date;
  mode: ViewMode;
  onChangeMode: (m: ViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const label =
    mode === "day"
      ? format(selectedDate, "EEEE, MMMM d")
      : mode === "week"
        ? (() => {
            const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
            const we = endOfWeek(selectedDate, { weekStartsOn: 1 });
            return isSameMonth(ws, we)
              ? format(ws, "MMMM yyyy")
              : `${format(ws, "MMM")} – ${format(we, "MMM yyyy")}`;
          })()
        : mode === "month"
          ? format(selectedDate, "MMMM yyyy")
          : format(selectedDate, "yyyy");

  return (
    <header className="bg-background flex h-12 shrink-0 items-center justify-between px-5">
      <div className="text-xl font-semibold tracking-tight">{label}</div>
      <div className="flex items-center gap-2">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => v && onChangeMode(v as ViewMode)}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="day">Day</ToggleGroupItem>
          <ToggleGroupItem value="week">Week</ToggleGroupItem>
          <ToggleGroupItem value="month">Month</ToggleGroupItem>
          <ToggleGroupItem value="year">Year</ToggleGroupItem>
        </ToggleGroup>
        <Button variant="outline" size="sm" className="h-7 px-3 text-xs" onClick={onToday}>
          Today
        </Button>
        <Button variant="ghost" size="sm" className="size-7 p-0" onClick={onPrev}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" className="size-7 p-0" onClick={onNext}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </header>
  );
}

// =============================================================================
// Views
// =============================================================================

function HourGutter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-auto">
      <div className="bg-muted/30 w-14 shrink-0 border-r">
        <div className="h-10 border-b" />
        {HOURS.map((h) => (
          <div
            key={h}
            className="text-muted-foreground flex justify-end pr-2 text-[10px]"
            style={{ height: ROW_HEIGHT }}
          >
            <span className="-mt-1.5">{format(new Date(2026, 0, 1, h), "h a")}</span>
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}

function DayColumn({
  day,
  events,
  withBorder,
}: {
  day: Date;
  events: MockEvent[];
  withBorder?: boolean;
}) {
  const today = startOfDay(new Date());
  const isToday = isSameDay(day, today);
  const dayEvents = events.filter((e) => isSameDay(e.start, day));
  return (
    <div className={`flex flex-1 flex-col ${withBorder ? "border-r" : ""}`}>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3 text-xs font-medium">
        <span className="text-muted-foreground">{format(day, "EEE")}</span>
        <span
          className={`grid size-6 place-items-center rounded ${
            isToday ? "bg-foreground text-background" : "text-foreground"
          }`}
        >
          {format(day, "d")}
        </span>
      </div>
      <div className="relative flex-1">
        {HOURS.map((h) => (
          <div key={h} className="border-b border-dashed" style={{ height: ROW_HEIGHT }} />
        ))}
        {dayEvents.map((evt) => {
          const top = (fractionalHour(evt.start) - HOUR_START) * ROW_HEIGHT;
          const height = (fractionalHour(evt.end) - fractionalHour(evt.start)) * ROW_HEIGHT;
          return (
            <div
              key={evt.id}
              className={`bg-secondary/60 hover:bg-secondary absolute left-1 right-1 rounded-md border-l-2 px-2 py-1.5 text-left text-[11px] transition-colors ${ACCOUNT_TINT[evt.accountId] ?? "border-l-foreground/40"}`}
              style={{ top, height: Math.max(height, 28) }}
            >
              <div className="truncate font-medium">{evt.title}</div>
              <div className="text-muted-foreground truncate">
                {format(evt.start, "h:mm a")}
                {evt.subtitle ? ` · ${evt.subtitle}` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ day, events }: { day: Date; events: MockEvent[] }) {
  return (
    <HourGutter>
      <DayColumn day={day} events={events} />
    </HourGutter>
  );
}

function WeekView({ weekStart, events }: { weekStart: Date; events: MockEvent[] }) {
  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  return (
    <HourGutter>
      {days.map((d, i) => (
        <DayColumn
          key={d.toISOString()}
          day={d}
          events={events}
          withBorder={i < days.length - 1}
        />
      ))}
    </HourGutter>
  );
}

function MonthView({
  month,
  events,
  onPickDay,
}: {
  month: Date;
  events: MockEvent[];
  onPickDay: (d: Date) => void;
}) {
  const monthStart = startOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = new Date();

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="grid grid-cols-7 border-b">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="text-muted-foreground border-r px-3 py-2 text-[10px] font-medium uppercase tracking-wider last:border-r-0"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 auto-rows-fr">
        {cells.map((d, idx) => {
          const inMonth = isSameMonth(d, monthStart);
          const isToday = isSameDay(d, today);
          const dayEvents = events.filter((e) => isSameDay(e.start, d));
          return (
            <button
              key={d.toISOString()}
              onClick={() => onPickDay(d)}
              className={`hover:bg-accent/40 group flex flex-col items-stretch gap-1 border-r border-b p-1.5 text-left transition-colors ${
                idx % 7 === 6 ? "border-r-0" : ""
              } ${!inMonth ? "bg-muted/20" : ""}`}
            >
              <div className="flex items-center gap-1">
                <span
                  className={`grid size-5 place-items-center rounded text-[11px] ${
                    isToday ? "bg-foreground text-background font-semibold" : inMonth ? "text-foreground" : "text-muted-foreground/40"
                  }`}
                >
                  {d.getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    className={`bg-secondary/60 truncate rounded border-l-2 px-1 text-[10px] leading-tight ${ACCOUNT_TINT[e.accountId] ?? "border-l-foreground/40"}`}
                  >
                    <span className="font-medium">{format(e.start, "h:mm a")}</span> {e.title}
                  </div>
                ))}
                {dayEvents.length > 3 ? (
                  <div className="text-muted-foreground text-[10px]">+{dayEvents.length - 3} more</div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function YearView({
  year,
  onPickMonth,
}: {
  year: Date;
  onPickMonth: (d: Date) => void;
}) {
  const yearStart = startOfYear(year);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));
  const today = new Date();
  return (
    <div className="grid flex-1 grid-cols-3 auto-rows-fr gap-4 overflow-auto p-4 lg:grid-cols-4">
      {months.map((m) => {
        const monthStart = startOfMonth(m);
        const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
        const monthLabel = format(m, "MMMM");
        return (
          <button
            key={m.toISOString()}
            onClick={() => onPickMonth(m)}
            className="hover:border-foreground/30 hover:bg-accent/30 flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{monthLabel}</span>
              {isSameYear(m, today) && m.getMonth() === today.getMonth() ? (
                <span className="text-muted-foreground text-[10px]">today</span>
              ) : null}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => (
                <div key={i} className="text-muted-foreground text-center text-[9px]">
                  {l}
                </div>
              ))}
              {cells.map((d) => {
                const inMonth = isSameMonth(d, monthStart);
                const isToday = isSameDay(d, today);
                const offsetWeeks = Math.abs(differenceInCalendarDays(d, monthStart)) > 35;
                if (offsetWeeks) return null;
                return (
                  <div
                    key={d.toISOString()}
                    className={`grid h-4 place-items-center rounded-[2px] text-[9px] ${
                      isToday
                        ? "bg-foreground text-background"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/30"
                    }`}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Right rail
// =============================================================================

function RightRail() {
  return (
    <aside className="w-[280px] shrink-0 overflow-auto border-l p-4">
      <div className="relative">
        <Search className="text-muted-foreground absolute left-2 top-1/2 size-3.5 -translate-y-1/2" />
        <Input placeholder="Search" className="bg-card h-8 pl-7 text-xs" />
      </div>
      <Separator className="my-4" />
      <Section title="No upcoming meetings" subdued />
      <Section title="Scheduling snippet">
        <Button
          variant="outline"
          size="sm"
          className="text-muted-foreground hover:text-foreground w-full justify-between text-xs"
        >
          <span className="flex items-center gap-1.5">
            <Share2 className="size-3.5" />
            Share availability
          </span>
          <ShortcutChip>S</ShortcutChip>
        </Button>
      </Section>
      <Section title="Team meeting">
        <Button
          variant="outline"
          size="sm"
          className="text-muted-foreground hover:text-foreground w-full justify-between text-xs"
        >
          <span className="flex items-center gap-1.5">
            <UserPlus className="size-3.5" />
            Meet with…
          </span>
          <ShortcutChip>F</ShortcutChip>
        </Button>
      </Section>
      <Section title="Useful shortcuts">
        <div className="space-y-1">
          <Shortcut label="Command menu" keys={["⌘", "K"]} />
          <Shortcut label="Menu bar calendar" keys={["⌃", "⌘", "K"]} />
          <Shortcut label="Go to date" keys={[","]} />
          <Shortcut label="All keyboard shortcuts" keys={["?"]} />
        </div>
      </Section>
      <Separator className="my-4" />
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground w-full justify-start gap-2 text-xs"
      >
        <CalendarIcon className="size-3.5" />
        Connect Google Calendar
      </Button>
    </aside>
  );
}

function Section({
  title,
  subdued,
  children,
}: {
  title: string;
  subdued?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 space-y-2">
      <div className={`text-[11px] font-medium ${subdued ? "text-muted-foreground" : "text-foreground"}`}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ShortcutChip({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium">
      {children}
    </kbd>
  );
}

function Shortcut({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="text-muted-foreground flex items-center justify-between text-[11px]">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((k) => (
          <ShortcutChip key={k}>{k}</ShortcutChip>
        ))}
      </span>
    </div>
  );
}
