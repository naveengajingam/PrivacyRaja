import type { ReactNode } from "react";
import { EmberField } from "./EmberField";

interface Props {
  children: ReactNode;
  showFrame?: boolean;
}

/**
 * Data Compliance Quest scene shell.
 * Deep circuit backdrop, animated hex grid, scanlines, neon particles.
 */
export function SceneShell({ children }: Props) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden scanlines">
      {/* Deep radial glow wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 15% 10%, oklch(0.62 0.3 315 / 0.25), transparent 55%)," +
            "radial-gradient(ellipse at 85% 90%, oklch(0.85 0.18 205 / 0.22), transparent 55%)," +
            "radial-gradient(circle at 50% 50%, oklch(0.07 0.03 260 / 0.1), oklch(0.04 0.02 260) 75%)",
        }}
      />

      {/* Animated circuit grid */}
      <div
        className="pointer-events-none absolute inset-0 circuit-grid animate-grid-pan opacity-60"
        aria-hidden
      />

      {/* Subtle scanning horizontal line */}
      <div
        className="pointer-events-none absolute inset-x-0 h-px opacity-40"
        style={{
          top: "50%",
          background:
            "linear-gradient(90deg, transparent, oklch(0.85 0.18 205 / 0.8) 50%, transparent)",
          boxShadow: "0 0 12px oklch(0.85 0.18 205 / 0.7)",
        }}
        aria-hidden
      />

      {/* Neon spark particles */}
      <EmberField count={55} />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
