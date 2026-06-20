/**
 * 404 orb — the brand orb with a question mark inside, instead of the
 * Focus icon. Recognizable as the OctoFocusAI mark, immediately reads
 * as "we don't know what you wanted."
 *
 * Strictly monochrome. Slow breath + rippling halos, same as the auth
 * orb. No destruction theatrics — just the calm, lost orb.
 */

export function DestroyedOrb({ size = 260 }: { size?: number }) {
  return (
    <div
      className="pointer-events-none relative grid place-items-center"
      style={{ width: size * 2, height: size * 2 }}
      aria-hidden
    >
      {/* Rippling halos */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
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
        className="animate-octo-pulse absolute rounded-full"
        style={{
          height: size * 2.6,
          width: size * 2.6,
          background:
            "radial-gradient(circle at 50% 45%, var(--orb-glow) 0%, var(--orb-glow-soft) 32%, transparent 60%)",
          filter: "blur(8px)",
        }}
      />

      {/* The orb sphere */}
      <div
        className="absolute grid place-items-center rounded-full"
        style={{
          height: size,
          width: size,
          background: "var(--orb-fill)",
          boxShadow:
            "inset 0 0 0 1.5px var(--orb-rim), inset 0 -50px 70px rgba(0,0,0,0.7), 0 0 80px 12px var(--orb-glow)",
        }}
      >
        <span
          className="font-semibold leading-none select-none"
          style={{
            color: "var(--orb-icon)",
            fontSize: size * 0.5,
          }}
        >
          ?
        </span>
      </div>
    </div>
  );
}
