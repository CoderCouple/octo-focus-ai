/**
 * Decorative backdrop for the auth pages.
 *
 * - A subtle dotted grid covering the whole viewport.
 * - A few wireframe diagram nodes + dashed connector lines scattered around,
 *   nodding to the canvas / diagram-as-code product without being noisy.
 * - Soft radial mask so the card area is light and the edges fade.
 *
 * Strictly monochrome. All decorative SVG is greyscale and dialed way down
 * with opacity so the login card remains the focal point.
 */
export function AuthBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Dotted grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(0 0% 70%) 1px, transparent 0)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, transparent 35%, black 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, transparent 35%, black 80%)",
        }}
      />

      {/* Decorative wireframe shapes */}
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        style={{ color: "hsl(0 0% 75%)" }}
      >
        {/* Top-left cluster */}
        <g opacity="0.55">
          <rect x="80" y="80" width="170" height="58" rx="10" />
          <rect x="80" y="170" width="170" height="58" rx="10" />
          <path d="M 250 109 C 330 109, 330 199, 410 199" strokeDasharray="4 4" />
          <rect x="410" y="170" width="170" height="58" rx="10" />
        </g>

        {/* Top-right cluster */}
        <g opacity="0.45">
          <circle cx="1000" cy="120" r="32" />
          <circle cx="1100" cy="200" r="22" />
          <path d="M 1000 152 L 1080 184" strokeDasharray="4 4" />
        </g>

        {/* Bottom-right cluster */}
        <g opacity="0.5">
          <rect x="870" y="560" width="200" height="64" rx="12" />
          <rect x="780" y="660" width="120" height="48" rx="10" />
          <rect x="950" y="660" width="120" height="48" rx="10" />
          <path d="M 970 624 L 840 660" strokeDasharray="4 4" />
          <path d="M 970 624 L 1010 660" strokeDasharray="4 4" />
        </g>

        {/* Bottom-left cluster */}
        <g opacity="0.4">
          <ellipse cx="180" cy="650" rx="70" ry="44" />
          <rect x="80" y="540" width="160" height="50" rx="10" />
          <path d="M 160 590 L 175 605" strokeDasharray="4 4" />
        </g>
      </svg>
    </div>
  );
}
