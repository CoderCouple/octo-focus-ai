import { notFound } from "next/navigation";
import { FloatingAiLauncher } from "@/features/ai-chat";
import { getNoteApi } from "@/features/notes/api/notes-api";
import { NotesPane } from "@/features/notes";
import { getProjectApi } from "@/features/projects/api/projects-api";
import { getMeApi } from "@/features/workspaces/api/workspaces-api";

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
    <div className="h-full">
      <NotesPane
        pageId={page.id}
        initialContent={page.document}
        initialSettings={page.settings ?? {}}
        noteTitle={page.title}
        initialVisibility={page.visibility}
        initialPublicSlug={page.publicSlug}
        workspaceSlug={workspaceSlug}
        workspaceId={project.workspaceId}
        closeHref="/workspace/notes"
      />
      <FloatingAiLauncher
        resourceKind="note"
        resourceId={page.id}
        resourceTitle={page.title}
      />
    </div>
  );
}
