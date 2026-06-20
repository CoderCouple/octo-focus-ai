/**
 * Black-hole inspired backdrop for the auth pages.
 *
 * The whole viewport goes black. A rotating accretion disk (dozens of
 * concentric tilted ellipses) spirals around a pitch-black event horizon.
 * A bright lensed pool blooms in the dead-center so the login card lives
 * on a readable white surface that feels like it's emerging from the
 * singularity itself — focus is literally at the center of gravity.
 *
 * A faint starfield grain plus a soft pulsing glow keep it alive without
 * being noisy. Strictly monochrome: black, white, grey. No color.
 */
export function AuthBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-black">
      {/* Slowly rotating accretion disk */}
      <div className="animate-octo-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <svg
          aria-hidden
          width="1800"
          height="1800"
          viewBox="-900 -900 1800 1800"
          fill="none"
          stroke="white"
          className="block"
        >
          <g transform="rotate(-22)">
            {Array.from({ length: 34 }).map((_, i) => {
              const rx = 70 + i * 24;
              const ry = rx * 0.34;
              const opacity = Math.max(0.03, 0.65 - i * 0.018);
              const strokeWidth = i < 3 ? 1.6 : i < 8 ? 0.9 : 0.5;
              return (
                <ellipse
                  key={i}
                  cx={0}
                  cy={0}
                  rx={rx}
                  ry={ry}
                  opacity={opacity}
                  strokeWidth={strokeWidth}
                />
              );
            })}
          </g>
        </svg>
      </div>

      {/* Counter-rotating, more transparent disk for parallax */}
      <div className="animate-octo-spin-slow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <svg
          aria-hidden
          width="1800"
          height="1800"
          viewBox="-900 -900 1800 1800"
          fill="none"
          stroke="white"
          className="block"
        >
          <g transform="rotate(8)">
            {Array.from({ length: 18 }).map((_, i) => {
              const rx = 140 + i * 38;
              const ry = rx * 0.22;
              const opacity = Math.max(0.03, 0.35 - i * 0.015);
              return (
                <ellipse
                  key={i}
                  cx={0}
                  cy={0}
                  rx={rx}
                  ry={ry}
                  opacity={opacity}
                  strokeWidth={0.5}
                />
              );
            })}
          </g>
        </svg>
      </div>

      {/* Bright hot ring just outside the event horizon */}
      <div
        aria-hidden
        className="animate-octo-pulse absolute top-1/2 left-1/2 h-[320px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at center, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.45) 42%, transparent 70%)",
          filter: "blur(10px)",
        }}
      />

      {/* Event horizon — pitch-black core */}
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 h-[230px] w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black"
        style={{ boxShadow: "0 0 80px 30px rgba(0,0,0,1)" }}
      />

      {/* Bright lensed pool — the readable surface the card sits on */}
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(255,255,255,1) 0%, rgba(255,255,255,0.93) 38%, rgba(255,255,255,0) 72%)",
        }}
      />

      {/* Starfield grain — fades toward center so the card area stays clean */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)",
          backgroundSize: "140px 140px",
          maskImage:
            "radial-gradient(circle at center, transparent 38%, black 72%)",
          WebkitMaskImage:
            "radial-gradient(circle at center, transparent 38%, black 72%)",
        }}
      />
    </div>
  );
}
