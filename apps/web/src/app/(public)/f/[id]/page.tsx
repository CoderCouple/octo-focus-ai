import { notFound } from "next/navigation";
import { getPublicFigureApi } from "@/features/figures/api/saved-figures-api";
import { FigureReadOnly } from "@/features/public/components/figure-readonly";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Public figure embed URL — same shape as `/c/<id>` for components.
 * Used when:
 *
 *   - a visitor opens https://octofocus.ai/f/<id> directly
 *   - a note that embeds the figure is published and a reader hits
 *     the public note view (the figure block fetches by figureId; if
 *     private / network-down it falls back to the snapshot it stored
 *     at embed time).
 */
export default async function PublicFigurePage({ params }: PageProps) {
  const { id } = await params;
  let figure;
  try {
    figure = await getPublicFigureApi(id);
  } catch {
    notFound();
  }
  if (!figure) notFound();

  return (
    <div className="h-screen w-screen">
      <FigureReadOnly dsl={figure.dsl} />
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  try {
    const figure = await getPublicFigureApi(id);
    return { title: `${figure.title} · OctoFocusAI` };
  } catch {
    return {};
  }
}
