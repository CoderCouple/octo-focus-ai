import { Focus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function MarketingNav() {
  return (
    <nav className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between px-6 py-4 md:px-10">
      <Link href="/" className="flex items-center gap-2 text-foreground">
        <div className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-md">
          <Focus className="size-3.5" strokeWidth={2.25} />
        </div>
        <span className="text-sm font-semibold tracking-tight">OctoFocusAI</span>
      </Link>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/signup">Get started</Link>
        </Button>
      </div>
    </nav>
  );
}
