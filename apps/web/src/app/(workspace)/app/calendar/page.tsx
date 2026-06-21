import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CalendarPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-8">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground text-sm">
            Sync your calendars and share bookable links — Calendly-style.
          </p>
        </div>
        <Button disabled className="gap-1.5">
          <Plus className="size-3.5" />
          New event type
        </Button>
      </header>

      <div className="border-border bg-card flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
        <div className="bg-secondary text-secondary-foreground grid size-10 place-items-center rounded-md">
          <Calendar className="size-5" />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-semibold">Calendar isn&apos;t wired up yet</div>
          <p className="text-muted-foreground max-w-md text-xs">
            Coming next: connect Google Calendar, create event types (e.g. &ldquo;30-min
            intro&rdquo;), set your availability, then share a public booking page like
            <code className="bg-secondary text-foreground mx-1 rounded px-1 py-0.5">/c/&lt;you&gt;/intro</code>
            with anyone.
          </p>
        </div>
      </div>
    </div>
  );
}
