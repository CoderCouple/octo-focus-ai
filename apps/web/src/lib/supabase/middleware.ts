import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "../env";

/**
 * When an unauthenticated visitor hits a focus-route URL, ask the API
 * whether the underlying resource is public. If yes, return the
 * matching `/p/<workspaceSlug>/<publicSlug>` pathname so the caller
 * can redirect there instead of /login. Fast-fail on any lookup error.
 */
async function tryResolvePublicTarget(pathname: string): Promise<string | null> {
  const match = pathname.match(/^\/(note|canvas|project)\/([^/]+)/);
  if (!match) return null;
  const urlKind = match[1];
  const id = match[2];
  const apiKind = urlKind === "note" ? "page" : urlKind;

  try {
    const lookupUrl = `${env.API_URL}/public/lookup?kind=${apiKind}&id=${encodeURIComponent(id)}`;
    const res = await fetch(lookupUrl, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as
      | {
          success?: boolean;
          data?: { workspaceSlug?: string; publicSlug?: string };
          result?: { workspaceSlug?: string; publicSlug?: string };
        }
      | null;
    const data = body?.data ?? body?.result ?? (body as { workspaceSlug?: string; publicSlug?: string });
    if (!data?.workspaceSlug || !data?.publicSlug) return null;
    return `/p/${data.workspaceSlug}/${data.publicSlug}`;
  } catch {
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute =
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/note/") ||
    pathname.startsWith("/canvas/") ||
    pathname.startsWith("/project/");

  if (!user && isProtectedRoute) {
    // Before sending an unauthenticated visitor to /login, give the
    // public lookup a chance: when the URL is /note/<id> /canvas/<id>
    // /project/<id> AND the underlying resource has been published,
    // bounce them straight to the public URL (`/p/<ws>/<slug>`) so
    // share links work for people who don't have an account.
    const publicTarget = await tryResolvePublicTarget(pathname);
    if (publicTarget) {
      const url = request.nextUrl.clone();
      url.pathname = publicTarget;
      url.search = "";
      return NextResponse.redirect(url);
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (pathname.startsWith("/login") || pathname.startsWith("/signup"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/workspace";
    return NextResponse.redirect(url);
  }

  return response;
}
