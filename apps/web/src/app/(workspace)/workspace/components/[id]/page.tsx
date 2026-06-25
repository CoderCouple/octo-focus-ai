import { notFound } from "next/navigation";
import { ComponentStudio } from "@/features/components";
import { getSavedComponentApi } from "@/features/components/api/saved-components-api";
import {
  getActiveWorkspaceIdCookie,
  resolveActiveMembership,
} from "@/features/workspaces";
import { getMeApi } from "@/features/workspaces/api/workspaces-api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ComponentEditPage({ params }: PageProps) {
  const { id } = await params;
  const me = await getMeApi();
  const activeId = await getActiveWorkspaceIdCookie();
  const active = resolveActiveMembership(me.memberships, activeId);
  if (!active) return null;

  let component;
  try {
    component = await getSavedComponentApi(id);
  } catch {
    notFound();
  }

  return <ComponentStudio workspaceId={active.workspace.id} initial={component} />;
}
