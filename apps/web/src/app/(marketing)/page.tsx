import {
  ArrowRight,
  Bot,
  FileText,
  Focus,
  LayoutGrid,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthBackdrop } from "../(auth)/_components/auth-backdrop";
import { Orb } from "./_components/orb";

interface Section {
  Icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
}

const SECTIONS: Section[] = [
  {
    Icon: FileText,
    eyebrow: "Notes",
    title: "Block-based notes.\nMarkdown source of truth.",
    body: "Type with the slash. Drag blocks. Embed diagrams. Every note saves as clean markdown so you can read it anywhere — raw view, AI prompts, public URL, or your own editor.",
  },
  {
    Icon: LayoutGrid,
    eyebrow: "Canvas",
    title: "Diagram as code.\nFreehand when you want it.",
    body: "Write A > B in our DSL and watch nodes land. Or sketch with the pencil and let auto-shape snap your wobbly circle to a perfect ellipse. Mermaid blocks render inline.",
  },
  {
    Icon: Sparkles,
    eyebrow: "Agents",
    title: "AI that doesn't move things\nwithout asking.",
    body: "Every AI mutation flows through a typed patch, gets audited, and waits for approval when the action is risky. Your workspace stays yours.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero — uses the same orb backdrop as the login page */}
      <section className="relative flex min-h-svh flex-col items-center overflow-hidden px-6 pt-32 pb-20 text-center md:px-10">
        <AuthBackdrop />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-8 pt-[300px]">
          <div className="border-border/60 bg-card/40 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="bg-foreground absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
              <span className="bg-foreground relative inline-flex h-1.5 w-1.5 rounded-full" />
            </span>
            Now in private beta
          </div>
          <h1 className="text-foreground text-4xl leading-[1.15] font-medium tracking-tight md:text-6xl">
            A focused workspace for
            <br />
            <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 md:gap-x-4">
              <Users
                className="size-8 md:size-12"
                strokeWidth={1.5}
                aria-hidden
              />
              Humans
              <span className="text-muted-foreground">and</span>
              <Bot
                className="size-8 md:size-12"
                strokeWidth={1.5}
                aria-hidden
              />
              Agents.
            </span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-base md:text-lg">
            OctoFocusAI blends a Notion-style notes editor with an Eraser-style canvas — and an
            AI layer that respects your structure. Built monochrome, on purpose.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/signup">
                Get started
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <a href="#features">See it in action</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature sections */}
      <div id="features" className="relative">
        {SECTIONS.map((section, i) => (
          <FeatureSection key={section.eyebrow} section={section} reversed={i % 2 === 1} />
        ))}
      </div>

      {/* Final CTA */}
      <section className="relative flex min-h-[80svh] flex-col items-center justify-center overflow-hidden px-6 py-32 text-center md:px-10">
        <div className="relative mb-12">
          <Orb Icon={Focus} size={200} ripples={5} />
        </div>
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-6">
          <h2 className="text-foreground text-3xl leading-tight font-medium tracking-tight md:text-5xl">
            Start drawing your first diagram
            <br />
            in 60 seconds.
          </h2>
          <p className="text-muted-foreground max-w-md text-base">
            No credit card. Magic-link or Google sign-in. Your dev workspace boots automatically.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link href="/signup">
              Get started
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function FeatureSection({
  section,
  reversed,
}: {
  section: Section;
  reversed: boolean;
}) {
  return (
    <section className="relative flex min-h-svh items-center overflow-hidden px-6 py-24 md:px-10">
      <div
        className={`mx-auto grid w-full max-w-6xl items-center gap-12 md:gap-20 ${
          reversed ? "md:grid-cols-[1fr_minmax(0,520px)]" : "md:grid-cols-[minmax(0,520px)_1fr]"
        }`}
      >
        <div
          className={`flex justify-center ${reversed ? "md:order-2" : ""}`}
        >
          <Orb Icon={section.Icon} size={220} ripples={6} />
        </div>
        <div
          className={`flex max-w-xl flex-col gap-6 ${reversed ? "md:order-1" : ""}`}
        >
          <div className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            {section.eyebrow}
          </div>
          <h2 className="text-foreground text-3xl leading-tight font-medium tracking-tight whitespace-pre-line md:text-5xl">
            {section.title}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">{section.body}</p>
        </div>
      </div>
    </section>
  );
}
