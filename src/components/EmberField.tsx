import { useMemo } from "react";

interface Props {
  count?: number;
  className?: string;
}

// Neon cyan / magenta / yellow / green sparks.
const COLORS = ["#00E5FF", "#FF2D6F", "#FFEE00", "#39FF88", "#B967FF"];

/**
 * Floating neon data-sparks rising from the bottom of the scene.
 * (Same shape API as the previous EmberField so existing call sites keep working.)
 */
export function EmberField({ count = 60, className = "" }: Props) {
  const sparks = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const size = 1.5 + Math.random() * 4;
        const left = Math.random() * 100;
        const delay = Math.random() * 14;
        const duration = 9 + Math.random() * 16;
        const dx = (Math.random() - 0.5) * 140;
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
      {sparks.map((e) => (
        <span
          key={e.id}
          className="animate-ember absolute bottom-[-20px] rounded-full"
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            background: e.color,
            boxShadow: `0 0 ${e.size * 6}px ${e.color}, 0 0 ${e.size * 12}px ${e.color}`,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.duration}s`,
            ["--dx" as never]: `${e.dx}px`,
          }}
        />
      ))}
    </div>
  );
}
