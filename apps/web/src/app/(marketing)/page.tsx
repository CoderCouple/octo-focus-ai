import { ArrowRight, Bot, FileText, Focus, LayoutGrid, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthBackdrop } from "@/features/auth";
import { AgentDemo } from "./_components/agent-demo";
import { CanvasDemo } from "./_components/canvas-demo";
import { FeatureSection } from "./_components/feature-section";
import { HeroSplitDemo } from "./_components/hero-split-demo";
import { NotesDemo } from "./_components/notes-demo";
import { Orb } from "./_components/orb";

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-svh flex-col items-center overflow-hidden px-4 pt-20 pb-12 text-center md:px-10 md:pt-24 md:pb-16">
        <AuthBackdrop showOrb={false} />
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-6 md:gap-8">
          <div className="border-border/60 bg-card/40 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="bg-foreground absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
              <span className="bg-foreground relative inline-flex h-1.5 w-1.5 rounded-full" />
            </span>
            Now in private beta
          </div>
          <h1 className="text-foreground text-2xl leading-[1.15] font-medium tracking-tight sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
            <span className="block whitespace-nowrap">The AI workspace for</span>
            <span className="mt-2 inline-flex items-center justify-center gap-x-2 whitespace-nowrap sm:gap-x-2.5 md:gap-x-3 lg:gap-x-4">
              <Users
                className="size-5 sm:size-6 md:size-8 lg:size-10 xl:size-12"
                strokeWidth={1.5}
                aria-hidden
              />
              Humans
              <span className="text-muted-foreground">and</span>
              <Bot
                className="size-5 sm:size-6 md:size-8 lg:size-10 xl:size-12"
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
            <Button asChild size="lg" variant="outline">
              <a href="#features">See it in action</a>
            </Button>
          </div>

          {/* Animated split hero preview */}
          <div className="mt-6 w-full md:mt-10">
            <HeroSplitDemo />
          </div>
        </div>
      </section>

      {/* Interactive feature sections */}
      <div id="features" className="relative">
        <FeatureSection
          Icon={FileText}
          eyebrow="Notes"
          title={"Block-based notes.\nMarkdown source of truth."}
          body="Type with the slash. Drag blocks. Every save also writes clean Markdown so your notes stay readable anywhere — raw view, public URL, AI prompts, your own editor."
          demo={<NotesDemo />}
        />
        <FeatureSection
          Icon={LayoutGrid}
          eyebrow="Canvas"
          title={"Diagram as code.\nFreehand when you want it."}
          body="Write A > B in our DSL and watch nodes land. Or sketch with the pencil and let auto-shape snap your wobbly circle to a clean ellipse. Try it →"
          demo={<CanvasDemo />}
          reversed
        />
        <FeatureSection
          Icon={Sparkles}
          eyebrow="Agents"
          title={"AI that doesn't move things\nwithout asking."}
          body="Every AI mutation flows through a typed patch, gets audited, and waits for approval when the action is risky. Your workspace stays yours."
          demo={<AgentDemo />}
        />
      </div>

      {/* Final CTA */}
      <section className="relative flex min-h-[80svh] flex-col items-center justify-center overflow-hidden px-4 py-24 text-center md:px-10 md:py-32">
        <div className="relative mb-10 md:mb-12">
          <Orb Icon={Focus} size={200} ripples={5} />
        </div>
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-6 px-2">
          <h2 className="text-foreground text-2xl leading-tight font-medium tracking-tight sm:text-3xl md:text-5xl">
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
