import "../globals.css";
import { Focus } from "lucide-react";
import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <header className="border-border/40 flex h-12 items-center justify-between border-b px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground grid size-5 place-items-center rounded">
            <Focus className="size-3" strokeWidth={2.25} />
          </div>
          <span className="text-sm font-semibold tracking-tight">OctoFocusAI</span>
        </Link>
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          Sign in
        </Link>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
