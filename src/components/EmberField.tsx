import { useMemo } from "react";

interface Props {
  count?: number;
  className?: string;
}

const COLORS = ["#FF9933", "#D4A017", "#FFD580", "#138808", "#FF6B1A"];

/**
 * Floating saffron/green/gold ember particles rising from the bottom.
 */
export function EmberField({ count = 60, className = "" }: Props) {
  const embers = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const size = 2 + Math.random() * 5;
        const left = Math.random() * 100;
        const delay = Math.random() * 14;
        const duration = 10 + Math.random() * 14;
        const dx = (Math.random() - 0.5) * 120;
        const color = COLORS[i % COLORS.length];
        return { size, left, delay, duration, dx, color, id: i };
      }),
    [count],
  );

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      {embers.map((e) => (
        <span
          key={e.id}
          className="animate-ember absolute bottom-[-20px] rounded-full"
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            background: e.color,
            boxShadow: `0 0 ${e.size * 4}px ${e.color}`,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.duration}s`,
            ["--dx" as never]: `${e.dx}px`,
          }}
        />
      ))}
    </div>
  );
}
