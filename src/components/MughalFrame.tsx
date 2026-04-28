import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

/**
 * Neon holographic HUD panel. (Same component name / API as the former
 * MughalFrame so call sites stay identical.)  Renders a dark translucent
 * card with a cyan neon crown bar, corner chevrons, and inner rule.
 */
export function MughalFrame({ children, className = "" }: Props) {
  return (
    <div className={`relative ${className}`}>
      {/* Neon crown bar (angular, not arched) */}
      <svg
        viewBox="0 0 400 56"
        preserveAspectRatio="none"
        className="absolute -top-[1px] left-0 h-12 w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="hudBar" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0" />
            <stop offset="20%" stopColor="#00E5FF" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#FF2D6F" stopOpacity="1" />
            <stop offset="80%" stopColor="#B967FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#B967FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* angular crown */}
        <path
          d="M 0 56 L 0 20 L 60 20 L 80 4 L 320 4 L 340 20 L 400 20 L 400 56 Z"
          fill="url(#hudBar)"
          opacity="0.85"
        />
        <path
          d="M 0 20 L 60 20 L 80 4 L 320 4 L 340 20 L 400 20"
          fill="none"
          stroke="#7af8ff"
          strokeWidth="0.7"
          opacity="0.9"
        />
      </svg>

      {/* Body */}
      <div className="filigree-border scanlines relative mt-10 rounded-2xl bg-[oklch(0.08_0.04_265_/_0.85)] backdrop-blur-md">
        {/* corner chevrons */}
        {[
          "left-2 top-2 border-l-2 border-t-2",
          "right-2 top-2 border-r-2 border-t-2",
          "left-2 bottom-2 border-l-2 border-b-2",
          "right-2 bottom-2 border-r-2 border-b-2",
        ].map((pos) => (
          <span
            key={pos}
            className={`absolute ${pos} h-4 w-4 rounded-sm border-[var(--gold)] shadow-[0_0_10px_var(--gold)]`}
          />
        ))}
        {/* inner cyan rule */}
        <div className="pointer-events-none absolute inset-3 rounded-xl border border-[var(--gold)]/25" />
        <div className="relative px-6 py-8 md:px-10 md:py-12">{children}</div>
      </div>
    </div>
  );
}
