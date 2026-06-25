import { notFound } from "next/navigation";
import { IframeArtifact } from "@/features/components";
import { getPublicComponentApi } from "@/features/components/api/saved-components-api";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Public embed URL — same shape as Loom / Figma / CodePen embeds. The
 * component runs inside the standard `IframeArtifact` (sandboxed,
 * Tailwind-isolated, self-contained HTML), occupying the full
 * viewport. Used when:
 *
 *   - a visitor opens https://octofocus.ai/c/<id> directly
 *   - a note that embeds the component is published and a reader
 *     hits the public note view (the generativeUi block fetches by
 *     componentId; if private/network-down it falls back to the
 *     snapshot it stored at embed time)
 */
export default async function PublicComponentPage({ params }: PageProps) {
  const { id } = await params;
  let component;
  try {
    component = await getPublicComponentApi(id);
  } catch {
    notFound();
  }
  if (!component) notFound();

  return (
    <div className="h-screen w-screen">
      <IframeArtifact code={component.code} className="h-full w-full" />
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  try {
    const component = await getPublicComponentApi(id);
    return { title: `${component.title} · OctoFocusAI` };
  } catch {
    return {};
  }
}
