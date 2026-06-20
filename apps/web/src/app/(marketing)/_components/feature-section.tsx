import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Orb } from "./orb";

interface FeatureSectionProps {
  Icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  demo: ReactNode;
  reversed?: boolean;
}

export function FeatureSection({
  Icon,
  eyebrow,
  title,
  body,
  demo,
  reversed,
}: FeatureSectionProps) {
  return (
    <section className="relative flex min-h-svh items-center overflow-hidden px-4 py-20 md:px-10 md:py-28">
      <div
        className={`mx-auto grid w-full max-w-6xl items-center gap-12 lg:gap-20 ${
          reversed ? "lg:grid-cols-[1fr_minmax(0,560px)]" : "lg:grid-cols-[minmax(0,560px)_1fr]"
        }`}
      >
        {/* Copy column */}
        <div
          className={`relative flex max-w-xl flex-col items-start gap-5 ${
            reversed ? "lg:order-2" : ""
          }`}
        >
          {/* Inline orb on mobile / sm above the headline */}
          <div className="relative -my-6 lg:hidden">
            <Orb Icon={Icon} size={140} ripples={4} />
          </div>
          <div className="text-muted-foreground inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase">
            <Icon className="size-3.5" />
            {eyebrow}
          </div>
          <h2 className="text-foreground text-3xl leading-tight font-medium tracking-tight whitespace-pre-line md:text-5xl">
            {title}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">{body}</p>
        </div>

        {/* Demo column */}
        <div
          className={`relative w-full ${reversed ? "lg:order-1" : ""}`}
        >
          {/* Hidden on mobile? No — show demo on all sizes. Orb on desktop only behind. */}
          <div className="pointer-events-none absolute -inset-12 hidden items-center justify-center lg:flex">
            <Orb Icon={Icon} size={260} ripples={5} />
          </div>
          <div className="relative">{demo}</div>
        </div>
      </div>
    </section>
  );
}
