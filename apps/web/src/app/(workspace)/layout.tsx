import { redirect } from "next/navigation";
import { getMeApi, type MeResponse } from "@/api/me-api";
import { getActiveWorkspaceIdCookie } from "@/actions/workspaces-action";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEV_ME: MeResponse = {
  user: {
    id: "usr_00000000-0000-0000-0000-000000000000",
    name: "Dev User",
    email: "dev@octofocus.local",
    avatarUrl: null,
  },
  memberships: [
    {
      membership: {
        id: "mem_00000000-0000-0000-0000-000000000001",
        role: "OWNER",
        workspaceId: "wsp_00000000-0000-0000-0000-000000000002",
      },
      workspace: {
        id: "wsp_00000000-0000-0000-0000-000000000002",
        name: "Dev workspace",
        slug: "dev-workspace",
      },
    },
  ],
};

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  let me: MeResponse;

  if (env.DEV_AUTH_BYPASS) {
    me = DEV_ME;
  } else {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    me = await getMeApi();
  }

  const activeId = await getActiveWorkspaceIdCookie();
  const active =
    (activeId && me.memberships.find((m) => m.workspace.id === activeId)) || me.memberships[0];

  if (!active) {
    return (
      <main className="grid min-h-screen place-items-center p-8 text-sm text-muted-foreground">
        No workspace found. Sign out and back in to bootstrap one.
      </main>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        workspace={active.workspace}
        memberships={me.memberships.map((m) => ({
          id: m.workspace.id,
          name: m.workspace.name,
          slug: m.workspace.slug,
          role: m.membership.role,
        }))}
        user={me.user}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">{active.workspace.name}</span>
            <span className="text-muted-foreground text-xs leading-tight">
              {active.membership.role.toLowerCase()} · {active.workspace.slug}
            </span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
