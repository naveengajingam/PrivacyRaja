import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

/**
 * Ornate Mughal-arch panel with gold filigree border.
 * The arch sits on top of the content; the body is a rounded rectangle
 * with gold inset rules and corner medallions.
 */
export function MughalFrame({ children, className = "" }: Props) {
  return (
    <div className={`relative ${className}`}>
      {/* Arch top */}
      <svg
        viewBox="0 0 400 80"
        preserveAspectRatio="none"
        className="absolute -top-[1px] left-0 h-16 w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="archGold" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFE9A8" />
            <stop offset="55%" stopColor="#D4A017" />
            <stop offset="100%" stopColor="#7a5a0e" />
          </linearGradient>
        </defs>
        <path
          d="M 0 80 L 0 50 C 0 22, 60 0, 200 0 C 340 0, 400 22, 400 50 L 400 80 Z"
          fill="url(#archGold)"
          stroke="#FFE9A8"
          strokeWidth="0.6"
        />
        <path
          d="M 8 78 L 8 52 C 8 28, 70 8, 200 8 C 330 8, 392 28, 392 52 L 392 78"
          fill="none"
          stroke="oklch(0.13 0.04 285)"
          strokeWidth="1"
        />
      </svg>

      {/* Body */}
      <div className="filigree-border relative mt-12 rounded-3xl bg-[oklch(0.14_0.05_285_/_0.85)] backdrop-blur-md">
        {/* corner medallions */}
        {[
          "left-3 top-3",
          "right-3 top-3",
          "left-3 bottom-3",
          "right-3 bottom-3",
        ].map((pos) => (
          <span
            key={pos}
            className={`absolute ${pos} h-3 w-3 rounded-full bg-[var(--gold)] shadow-[0_0_10px_var(--gold)]`}
          />
        ))}
        {/* inner gold rule */}
        <div className="pointer-events-none absolute inset-3 rounded-2xl border border-[oklch(0.74_0.13_80_/_0.35)]" />
        <div className="relative px-6 py-8 md:px-10 md:py-12">{children}</div>
      </div>
    </div>
  );
}
