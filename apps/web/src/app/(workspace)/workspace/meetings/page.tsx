import { Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  getActiveWorkspaceIdCookie,
  resolveActiveMembership,
} from "@/features/workspaces";
import { getMeApi } from "@/features/workspaces/api/workspaces-api";

export default async function MeetingsPage() {
  const me = await getMeApi();
  const activeId = await getActiveWorkspaceIdCookie();
  const active = resolveActiveMembership(me.memberships, activeId);
  if (!active) return null;

  return (
    <section className="flex h-full flex-col gap-8 p-8">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">Meetings</h1>
        <p className="text-muted-foreground text-sm">
          Capture meeting notes, record sessions, and generate AI summaries.
        </p>
      </div>
      <Card className="grid place-items-center gap-3 p-12 text-center">
        <div className="border-border text-foreground grid h-12 w-12 place-items-center rounded-md border">
          <Video className="h-6 w-6" />
        </div>
        <div className="grid gap-1">
          <div className="text-sm font-semibold">Coming soon</div>
          <div className="text-muted-foreground max-w-md text-xs">
            Meetings will let you record, transcribe, and turn discussions into
            notes and diagrams. Available for workspace{" "}
            <span className="font-medium text-foreground">{active.workspace.name}</span>.
          </div>
        </div>
      </Card>
    </section>
  );
}
