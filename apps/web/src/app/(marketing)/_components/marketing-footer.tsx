import { Focus } from "lucide-react";
import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-border/40 relative z-10 border-t px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
        <Link href="/" className="text-foreground flex items-center gap-2">
          <div className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-md">
            <Focus className="size-3.5" strokeWidth={2.25} />
          </div>
          <span className="text-sm font-semibold tracking-tight">OctoFocusAI</span>
        </Link>
        <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
          <a href="#features" className="hover:text-foreground transition-colors">
            Features
          </a>
          <Link href="/login" className="hover:text-foreground transition-colors">
            Sign in
          </Link>
          <a href="https://github.com" className="hover:text-foreground transition-colors">
            GitHub
          </a>
          <span>© 2026 OctoFocusAI</span>
        </div>
      </div>
    </footer>
  );
}
