import { ArrowLeft, Focus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="bg-background grid min-h-svh place-items-center px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <div className="bg-primary text-primary-foreground grid h-12 w-12 place-items-center rounded-xl">
          <Focus className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <div className="space-y-2">
          <div className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
            404
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Out of focus</h1>
          <p className="text-muted-foreground text-sm">
            We couldn&apos;t find that page. It may have been moved, archived, or never existed.
          </p>
        </div>
        <Button asChild>
          <Link href="/app">
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>
        </Button>
      </div>
    </main>
  );
}
