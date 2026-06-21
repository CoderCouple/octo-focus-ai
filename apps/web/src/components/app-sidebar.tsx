"use client";

import { FileText, Home, LayoutGrid, Settings } from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher, type TeamSummary } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  workspace: { id: string; name: string; slug: string };
  memberships: TeamSummary[];
  user: { name: string; email: string; avatarUrl: string | null };
}

export function AppSidebar({ workspace, memberships, user, ...props }: AppSidebarProps) {
  const navMain = [
    { title: "Home", url: "/app", icon: Home },
    { title: "Notes", url: "/app/notes", icon: FileText },
    { title: "Canvas", url: "/app/canvas", icon: LayoutGrid },
    { title: "Settings", url: "/app/settings", icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher activeWorkspaceId={workspace.id} teams={memberships} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{ name: user.name, email: user.email, avatar: user.avatarUrl ?? "" }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
