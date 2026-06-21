/**
 * Notion-Calendar-style three-pane shell.
 *
 *   Left  — mini month + connected calendars
 *   Center — week (5-day) grid with timed events
 *   Right — search, scheduling snippet, quick actions, keyboard shortcuts
 *
 * Monochrome: per brand rule events ship in grey tones only. Per-account
 * "tint" is just a different border width / left-bar shade, not hue.
 *
 * Data is mocked for the shell. Real wiring happens when Phase A (schema +
 * Google OAuth) lands.
 */
"use client";

import {
  addDays,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
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
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface MockAccount {
  email: string;
  label: string;
  accounts: Array<{ id: string; name: string; tint: "0" | "1" | "2" | "3" | "4" }>;
}

interface MockEvent {
  id: string;
  accountId: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  subtitle?: string;
}

const MOCK_ACCOUNTS: MockAccount[] = [
  {
    email: "you@octofocus.ai",
    label: "Work",
    accounts: [
      { id: "work", name: "Work", tint: "0" },
      { id: "team", name: "Team meetings", tint: "1" },
      { id: "core", name: "Engineering core", tint: "2" },
    ],
  },
  {
    email: "you@gmail.com",
    label: "Personal",
    accounts: [
      { id: "personal", name: "Personal", tint: "3" },
      { id: "family", name: "Family", tint: "4" },
      { id: "holidays", name: "Holidays", tint: "1" },
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
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(day);
  end.setHours(endHour, 0, 0, 0);
  return { id: `${accountId}-${title}-${day.toISOString()}`, accountId, title, start, end, subtitle };
}

function generateMockEvents(weekStart: Date): MockEvent[] {
  const events: MockEvent[] = [];
  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
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
  return events;
}

const TINT_CLASS: Record<MockEvent["accountId"] | string, string> = {
  work: "border-l-foreground/80",
  team: "border-l-foreground/55",
  core: "border-l-foreground/35",
  personal: "border-l-foreground/70",
  family: "border-l-foreground/45",
  holidays: "border-l-foreground/25",
};

const DOT_CLASS: Record<string, string> = {
  "0": "bg-foreground",
  "1": "bg-foreground/65",
  "2": "bg-foreground/40",
  "3": "bg-foreground/80",
  "4": "bg-foreground/50",
};

const HOUR_START = 8;
const HOUR_END = 21;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const ROW_HEIGHT = 56; // px per hour

function fractionalHour(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

export function CalendarShell() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeAccounts, setActiveAccounts] = useState<Set<string>>(
    () => new Set(MOCK_ACCOUNTS.flatMap((g) => g.accounts.map((a) => a.id))),
  );

  const weekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 1 }),
    [selectedDate],
  );
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const events = useMemo(() => generateMockEvents(weekStart), [weekStart]);
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

  return (
    <div className="bg-background flex h-[calc(100vh-3.5rem)]">
      <LeftRail
        selectedDate={selectedDate}
        onSelectDate={(d) => d && setSelectedDate(d)}
        accountGroups={MOCK_ACCOUNTS}
        activeAccounts={activeAccounts}
        onToggleAccount={toggleAccount}
      />
      <main className="flex flex-1 flex-col overflow-hidden border-l">
        <CenterHeader
          weekStart={weekStart}
          weekEnd={weekEnd}
          onPrev={() => setSelectedDate((d) => addDays(d, -7))}
          onNext={() => setSelectedDate((d) => addDays(d, 7))}
          onToday={() => setSelectedDate(new Date())}
        />
        <WeekGrid days={weekDays} events={visibleEvents} />
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
  onSelectDate: (d: Date | undefined) => void;
  accountGroups: MockAccount[];
  activeAccounts: Set<string>;
  onToggleAccount: (id: string) => void;
}) {
  return (
    <aside className="w-[240px] shrink-0 overflow-auto p-3">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onSelectDate}
        weekStartsOn={1}
      />
      <Separator className="my-3" />
      <div className="space-y-4 px-1 pb-6">
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
                      className="hover:bg-accent group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors"
                    >
                      <span
                        className={`grid size-3.5 shrink-0 place-items-center rounded-[3px] border ${
                          checked ? "border-foreground/40" : "border-foreground/15"
                        }`}
                      >
                        {checked ? (
                          <span className={`size-2 rounded-[1.5px] ${DOT_CLASS[acct.tint]}`} />
                        ) : null}
                      </span>
                      <span
                        className={checked ? "text-foreground" : "text-muted-foreground"}
                      >
                        {acct.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="text-muted-foreground w-full justify-start gap-2 px-2 text-xs">
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
  weekStart,
  weekEnd,
  onPrev,
  onNext,
  onToday,
}: {
  weekStart: Date;
  weekEnd: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const label =
    weekStart.getMonth() === weekEnd.getMonth()
      ? format(weekStart, "MMMM yyyy")
      : `${format(weekStart, "MMM")} – ${format(weekEnd, "MMM yyyy")}`;
  return (
    <header className="bg-background flex h-12 shrink-0 items-center justify-between px-5">
      <div className="text-xl font-semibold tracking-tight">{label}</div>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
          5 days
        </Button>
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

function WeekGrid({ days, events }: { days: Date[]; events: MockEvent[] }) {
  const today = startOfDay(new Date());
  return (
    <div className="flex flex-1 overflow-hidden border-t">
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
      <div className="flex flex-1 overflow-auto">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const dayEvents = events.filter((e) => isSameDay(e.start, day));
          return (
            <div
              key={day.toISOString()}
              className={`flex flex-1 flex-col ${i < days.length - 1 ? "border-r" : ""}`}
            >
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
                  <div
                    key={h}
                    className="border-b border-dashed"
                    style={{ height: ROW_HEIGHT }}
                  />
                ))}
                {dayEvents.map((evt) => {
                  const top = (fractionalHour(evt.start) - HOUR_START) * ROW_HEIGHT;
                  const height =
                    (fractionalHour(evt.end) - fractionalHour(evt.start)) * ROW_HEIGHT;
                  return (
                    <div
                      key={evt.id}
                      className={`bg-secondary/60 hover:bg-secondary absolute left-1 right-1 rounded-md border-l-2 px-2 py-1.5 text-left text-[11px] transition-colors ${TINT_CLASS[evt.accountId] ?? "border-l-foreground/40"}`}
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
        })}
      </div>
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
      <Button variant="ghost" size="sm" className="text-muted-foreground w-full justify-start gap-2 text-xs">
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
      <div
        className={`text-[11px] font-medium ${
          subdued ? "text-muted-foreground" : "text-foreground"
        }`}
      >
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
