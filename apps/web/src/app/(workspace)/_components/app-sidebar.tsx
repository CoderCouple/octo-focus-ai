"use client";

import {
  FileText,
  Focus,
  HelpCircle,
  Home,
  LayoutGrid,
  Network,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavMain, type NavItem } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";

const navMain: NavItem[] = [
  { title: "Home", url: "/", icon: Home },
  { title: "Projects", url: "/projects", icon: FileText },
  { title: "Notes", url: "/notes", icon: FileText },
  { title: "Canvas", url: "/canvas", icon: LayoutGrid },
  { title: "Agents", url: "/agents", icon: Sparkles },
  { title: "Graph", url: "/graph", icon: Network },
];

const navSecondary = [
  { title: "Search", url: "/search", icon: Search },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Help", url: "/help", icon: HelpCircle },
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  workspace: { name: string; slug: string };
  user: { name: string; email: string; avatarUrl: string | null };
}

export function AppSidebar({ workspace, user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="/">
                <div className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-md">
                  <Focus className="size-4" strokeWidth={2.25} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">OctoFocusAI</span>
                  <span className="text-muted-foreground truncate text-xs">{workspace.name}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
