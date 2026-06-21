import { notFound } from "next/navigation";
import { fetchPublicBySlug } from "@/api/public-api";
import { PublicResourceRenderer } from "../../../_components/public-resource-renderer";

export const revalidate = 60;

export default async function PublicResourcePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; slug: string }>;
}) {
  const { workspaceSlug, slug } = await params;
  const resource = await fetchPublicBySlug(workspaceSlug, slug);
  if (!resource) notFound();
  return <PublicResourceRenderer resource={resource} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceSlug: string; slug: string }>;
}) {
  const { workspaceSlug, slug } = await params;
  const resource = await fetchPublicBySlug(workspaceSlug, slug);
  if (!resource) return {};
  const title =
    resource.kind === "project" ? resource.data.name : resource.data.title;
  return { title: `${title} · OctoFocusAI` };
}
