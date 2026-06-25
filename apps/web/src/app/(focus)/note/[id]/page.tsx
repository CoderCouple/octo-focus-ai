import { notFound } from "next/navigation";
import { AiChatPanel } from "@/features/ai-chat";
import { getNoteApi } from "@/features/notes/api/notes-api";
import { NotesPane } from "@/features/notes";
import { getProjectApi } from "@/features/projects/api/projects-api";
import { getMeApi } from "@/features/workspaces/api/workspaces-api";
import { CloseButton } from "../../_components/close-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FocusNotePage({ params }: PageProps) {
  const { id } = await params;

  let page;
  try {
    page = await getNoteApi(id);
  } catch {
    notFound();
  }

  const [project, me] = await Promise.all([getProjectApi(page.projectId), getMeApi()]);
  const workspaceSlug =
    me.memberships.find((m) => m.workspace.id === project.workspaceId)?.workspace.slug ?? "";

  return (
    <div className="relative flex h-full">
      <CloseButton href="/workspace/notes" />
      <div className="flex-1 overflow-hidden">
        <NotesPane
          pageId={page.id}
          initialContent={page.document}
          initialSettings={page.settings ?? {}}
          noteTitle={page.title}
          initialVisibility={page.visibility}
          initialPublicSlug={page.publicSlug}
          workspaceSlug={workspaceSlug}
        />
      </div>
      <AiChatPanel resourceKind="note" resourceId={page.id} resourceTitle={page.title} />
    </div>
  );
}
