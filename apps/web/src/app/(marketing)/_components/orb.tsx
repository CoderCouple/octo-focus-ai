/**
 * Endel-style focal orb for marketing sections.
 *
 * Glossy spherical sphere with rippling halos, soft atmospheric glow, and a
 * brand mark or product mark at its center. Used as the focal element of
 * each landing-page section.
 *
 * Driven by the same --orb-* CSS custom properties as the auth backdrop so
 * the look is consistent across the whole app.
 */

import type { LucideIcon } from "lucide-react";

interface OrbProps {
  Icon: LucideIcon;
  size?: number;
  ripples?: number;
  className?: string;
}

export function Orb({ Icon, size = 280, ripples = 6, className }: OrbProps) {
  return (
    <div
      className={`pointer-events-none relative grid place-items-center ${className ?? ""}`}
      style={{ width: size * 2, height: size * 2 }}
    >
      {/* Rippling rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {Array.from({ length: ripples }).map((_, i) => (
          <div
            key={i}
            className="animate-octo-ripple absolute top-0 left-0 rounded-full"
            style={{
              height: size,
              width: size,
              border: "1px solid var(--orb-ripple)",
              animationDelay: `${i * 0.625}s`,
            }}
          />
        ))}
      </div>

      {/* Atmospheric glow */}
      <div
        aria-hidden
        className="animate-octo-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          height: size * 2.9,
          width: size * 2.9,
          background:
            "radial-gradient(circle at 50% 45%, var(--orb-glow) 0%, var(--orb-glow-soft) 32%, transparent 60%)",
          filter: "blur(8px)",
        }}
      />

      {/* Orb sphere */}
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          height: size,
          width: size,
          background: "var(--orb-fill)",
          boxShadow:
            "inset 0 0 0 1.5px var(--orb-rim), inset 0 -50px 70px rgba(0,0,0,0.7), 0 0 80px 12px var(--orb-glow)",
        }}
      >
        <Icon
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: size * 0.23,
            height: size * 0.23,
            color: "var(--orb-icon)",
          }}
          strokeWidth={1.5}
          aria-hidden
        />
      </div>
    </div>
  );
}
