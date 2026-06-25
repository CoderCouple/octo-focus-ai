"use client";

import { X } from "lucide-react";
import Link from "next/link";

/**
 * Discreet close affordance for the focused view. Sits in the top-left
 * absolute corner so the resource gets the whole viewport. Click routes
 * back to the resource list (notes / canvas) — not the workspace
 * landing or breadcrumb. The label is sr-only by design; the icon is
 * universal.
 */
export function CloseButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Close"
      className="border-border bg-background hover:bg-accent absolute left-3 top-3 z-50 grid size-8 place-items-center rounded-md border shadow-sm"
    >
      <X className="size-4" />
    </Link>
  );
}
