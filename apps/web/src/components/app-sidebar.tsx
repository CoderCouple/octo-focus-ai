"use client";

import {
  FileText,
  Focus,
  Home,
  LayoutGrid,
  Network,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  workspace: { name: string; slug: string };
  user: { name: string; email: string; avatarUrl: string | null };
}

export function AppSidebar({ workspace, user, ...props }: AppSidebarProps) {
  const data = {
    user: {
      name: user.name,
      email: user.email,
      avatar: user.avatarUrl ?? "",
    },
    teams: [
      {
        name: workspace.name,
        logo: Focus,
        plan: "Workspace",
      },
    ],
    navMain: [
      { title: "Home", url: "/", icon: Home },
      { title: "Notes", url: "/notes", icon: FileText },
      { title: "Canvas", url: "/canvas", icon: LayoutGrid },
      { title: "Agents", url: "/agents", icon: Sparkles },
      { title: "Graph", url: "/graph", icon: Network },
      { title: "Search", url: "/search", icon: Search },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
