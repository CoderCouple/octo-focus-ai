import { fetchByShareToken, PublicResourceRenderer } from "@/features/public";
import { SharePasswordGate } from "./_components/share-password-gate";

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ pw?: string }>;
}) {
  const { token } = await params;
  const { pw } = await searchParams;
  const { resource, needsPassword } = await fetchByShareToken(token, pw);

  if (!resource) {
    if (needsPassword) return <SharePasswordGate token={token} />;
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Link expired</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          This share link has been revoked, expired, or never existed.
        </p>
      </div>
    );
  }

  // Reshape into the same envelope the public-by-slug renderer expects.
  // For project shares we don't have eager page/canvas children — the link
  // grants only the project resource itself, so consumers see the header.
  const wrapped =
    resource.kind === "page"
      ? { kind: "page" as const, workspaceSlug: "", data: resource.data as never }
      : resource.kind === "canvas"
        ? { kind: "canvas" as const, workspaceSlug: "", data: resource.data as never }
        : {
            kind: "project" as const,
            workspaceSlug: "",
            data: resource.data as never,
            page: null,
            canvas: null,
          };
  return <PublicResourceRenderer resource={wrapped} />;
}
