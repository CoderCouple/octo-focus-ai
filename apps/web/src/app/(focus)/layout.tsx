import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Minimal layout for the focused note / canvas view. No sidebar, no
 * breadcrumb, no back-to-workspace navigation — the resource takes the
 * full viewport. Auth is still enforced server-side: not signed in →
 * /login.
 *
 * The close affordance lives inside each page so it can route back to
 * the right list (notes vs canvas) without a layout-level button that
 * doesn't know what type of resource is rendered.
 */
export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <div className="h-screen w-screen overflow-hidden">{children}</div>;
}
