import {
  FileText,
  Focus,
  Home,
  LayoutGrid,
  Network,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProjectsPanel } from "@/components/projects/projects-panel";
import { apiFetch } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

const sidebarItems: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Home", icon: Home },
  { label: "Notes", icon: FileText },
  { label: "Canvas", icon: LayoutGrid },
  { label: "Agents", icon: Sparkles },
  { label: "Graph", icon: Network },
  { label: "Search", icon: Search },
];

interface MeResponse {
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  memberships: Array<{
    membership: { id: string; role: "OWNER" | "ADMIN" | "MEMBER"; workspaceId: string };
    workspace: { id: string; name: string; slug: string };
  }>;
}

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const me = await apiFetch<MeResponse>("/me");
  const active = me.memberships[0];

  return (
    <main className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="flex flex-col border-r border-border bg-card/70 p-3">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Focus className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div>
            <div className="text-sm font-semibold">OctoFocusAI</div>
            <div className="text-xs text-muted-foreground">Human + AI workspace</div>
          </div>
        </div>

        <nav className="grid gap-1">
          {sidebarItems.map(({ label, icon: Icon }) => (
            <Button
              key={label}
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 font-normal text-muted-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </nav>

        <div className="mt-auto grid gap-2 border-t border-border pt-3">
          <div className="px-2">
            <div className="truncate text-sm font-medium">{me.user.name}</div>
            <div className="truncate text-xs text-muted-foreground">{me.user.email}</div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <section className="grid grid-rows-[56px_1fr]">
        <header className="flex items-center justify-between border-b border-border bg-card/70 px-6">
          <div>
            <h1 className="text-base font-semibold">{active?.workspace.name ?? "Workspace"}</h1>
            <p className="text-xs text-muted-foreground">
              {active?.membership.role.toLowerCase()} · {active?.workspace.slug}
            </p>
          </div>
        </header>

        {active ? (
          <ProjectsPanel workspaceId={active.workspace.id} />
        ) : (
          <div className="p-8 text-sm text-muted-foreground">
            No workspace yet. Sign out and back in to bootstrap one.
          </div>
        )}
      </section>
    </main>
  );
}
