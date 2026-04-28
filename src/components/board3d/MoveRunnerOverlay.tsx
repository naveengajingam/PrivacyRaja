import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAvatar, type ElementId } from "@/game/avatars";

interface Props {
  /** Active player's element (drives visuals). */
  element: ElementId | null;
  /** Active player's currently displayed tile index. */
  currentTile: number | null;
  /** Total tiles in the pending move (so we can show "3 / 5"). */
  steps: number;
  /** Current step number (1..steps). */
  stepIndex: number;
  /** Whether the piece is currently moving tile-to-tile. */
  visible: boolean;
}

/**
 * Cricket-runner-style 2D overlay shown while an avatar traverses tiles.
 * Sits above the 3D canvas; shows a side-view of the element running.
 */
export function MoveRunnerOverlay({ element, currentTile, steps, stepIndex, visible }: Props) {
  const av = getAvatar(element);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      return;
    }
    // linger briefly so last step is visible
    const t = setTimeout(() => setShow(false), 300);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <AnimatePresence>
      {show && av && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none absolute inset-x-0 top-4 z-20 mx-auto flex w-[min(92%,560px)] items-center justify-center"
        >
          <div
            className="relative w-full overflow-hidden rounded-xl border border-[var(--gold)]/40 backdrop-blur-md"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.08 0.04 285 / 0.92), oklch(0.12 0.07 285 / 0.85))",
              boxShadow: "0 0 28px oklch(0.85 0.18 205 / 0.35)",
            }}
          >
            {/* Scanlines */}
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                background:
                  "repeating-linear-gradient(0deg, transparent 0 2px, oklch(0.85 0.18 205 / 0.15) 2px 3px)",
              }}
            />
            <div className="flex items-center gap-4 px-4 py-3">
              {/* Runner lane */}
              <div className="relative h-14 flex-1 overflow-hidden rounded-md border border-[var(--gold)]/20 bg-[oklch(0.04_0.02_285)]">
                {/* ground glow line */}
                <div
                  className="absolute inset-x-0 bottom-2 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, #00E5FF, transparent)" }}
                />
                {/* tile ticks */}
                <div className="absolute inset-x-3 bottom-3 flex items-end justify-between">
                  {Array.from({ length: Math.max(steps, 1) }).map((_, i) => (
                    <div
                      key={i}
                      className="h-2 w-[2px]"
                      style={{
                        background: i < stepIndex ? av.glow : "oklch(0.35 0.04 285)",
                        boxShadow: i < stepIndex ? `0 0 6px ${av.glow}` : "none",
                      }}
                    />
                  ))}
                </div>
                {/* runner */}
                <motion.div
                  className="absolute bottom-3 flex h-9 w-9 items-center justify-center rounded-full"
                  animate={{
                    left: `calc(${(stepIndex / Math.max(steps, 1)) * 100}% - 18px)`,
                  }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  style={{
                    background: `radial-gradient(circle, ${av.color}, ${av.glow})`,
                    boxShadow: `0 0 18px ${av.glow}, 0 0 36px ${av.color}`,
                  }}
                >
                  <motion.span
                    className="text-xl"
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.4, repeat: Infinity }}
                  >
                    {av.symbol}
                  </motion.span>
                  {/* trailing streak */}
                  <motion.div
                    className="absolute right-full top-1/2 h-[3px] w-10 -translate-y-1/2 rounded-full"
                    animate={{ opacity: [0.9, 0.3, 0.9] }}
                    transition={{ duration: 0.3, repeat: Infinity }}
                    style={{
                      background: `linear-gradient(90deg, transparent, ${av.glow})`,
                      filter: "blur(1px)",
                    }}
                  />
                </motion.div>
              </div>
              {/* HUD counter */}
              <div className="flex min-w-[96px] flex-col items-end font-display">
                <span className="text-[9px] uppercase tracking-[0.3em] text-[var(--gold-soft)]/70">
                  {av.name}
                </span>
                <span className="text-lg text-[var(--gold)]">
                  {stepIndex} <span className="text-[var(--gold-soft)]/50">/ {steps}</span>
                </span>
                <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--gold-soft)]/60">
                  Tile {currentTile ?? "—"}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
