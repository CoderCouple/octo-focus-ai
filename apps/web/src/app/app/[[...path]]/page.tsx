import { permanentRedirect } from "next/navigation";

interface PageProps {
  params: Promise<{ path?: string[] }>;
}

/**
 * Backward-compat catch-all. The authenticated tree moved from `/app/*`
 * to `/workspace/*`; this 308-redirects every old URL to the new shape
 * so bookmarks, the auth callback's previous default `next=/app`, and
 * any external links keep working.
 */
export default async function LegacyAppRedirect({ params }: PageProps) {
  const { path = [] } = await params;
  const target = path.length > 0 ? `/workspace/${path.join("/")}` : "/workspace";
  permanentRedirect(target);
}
