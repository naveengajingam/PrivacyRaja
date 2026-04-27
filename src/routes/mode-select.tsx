import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { SceneShell } from "@/components/SceneShell";
import { useGameStore, type GameMode } from "@/store/useGameStore";

export const Route = createFileRoute("/mode-select")({
  head: () => ({
    meta: [
      { title: "Choose Your Battle — Privacy Raja" },
      {
        name: "description",
        content:
          "Pick Solo vs Computer or Multiplayer. Choose your mode and step onto the saffron-white-green battlefield.",
      },
      { property: "og:title", content: "Choose Your Battle — Privacy Raja" },
      {
        property: "og:description",
        content: "Solo vs Computer, or Multiplayer. The battlefield awaits.",
      },
    ],
  }),
  component: ModeSelect,
});

interface ModeOption {
  id: GameMode;
  title: string;
  hindi: string;
  blurb: string;
  bullets: string[];
  icon: string;
  to: "/avatar-select" | "/multiplayer-setup";
  primary: string;
  secondary: string;
}

const OPTIONS: ModeOption[] = [
  {
    id: "solo",
    title: "Solo vs Computer",
    hindi: "एकल युद्ध",
    blurb: "Train against AI rivals. Master the principles before the realm.",
    bullets: ["1 player + 1–3 bots", "Adjustable difficulty", "Quick start"],
    icon: "🛡",
    to: "/avatar-select",
    primary: "#FF9933",
    secondary: "#D4A017",
  },
  {
    id: "online",
    title: "Multiplayer",
    hindi: "बहु खिलाड़ी रण",
    blurb:
      "Summon allies online or pass-and-play locally. Up to 4 elemental warriors.",
    bullets: ["Online room codes", "Local pass & play", "Up to 4 players"],
    icon: "⚔",
    to: "/multiplayer-setup",
    primary: "#138808",
    secondary: "#D4A017",
  },
];

function ModeSelect() {
  return (
    <SceneShell>
      <main className="relative flex min-h-screen flex-col items-center px-6 py-16">
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <p className="mb-3 font-body text-xs uppercase tracking-[0.5em] text-[var(--gold-soft)]/70">
            Step Onto The Battlefield
          </p>
          <h1 className="text-gold-glow font-display text-4xl md:text-6xl">
            Choose Your Battle
          </h1>
          <div
            className="mx-auto mt-5 h-[3px] w-44 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #FF9933 0% 33.3%, #FFFFFF 33.3% 66.6%, #138808 66.6% 100%)",
              boxShadow: "0 0 14px oklch(0.74 0.13 80 / 0.5)",
            }}
          />
        </motion.header>

        <div className="grid w-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
          {OPTIONS.map((opt, i) => (
            <ModeCard key={opt.id} option={opt} index={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12"
        >
          <Link
            to="/"
            className="font-body text-xs uppercase tracking-[0.4em] text-[var(--gold-soft)]/60 transition hover:text-[var(--gold)]"
          >
            ← Back to Hall
          </Link>
        </motion.div>
      </main>
    </SceneShell>
  );
}

function ModeCard({ option, index }: { option: ModeOption; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const setMode = useGameStore((s) => s.setMode);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -py * 8, ry: px * 10 });
  }
  function onLeave() {
    setTilt({ rx: 0, ry: 0 });
  }

  function go() {
    setMode(option.id);
    navigate({ to: option.to });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.25 + index * 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onClick={go}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && go()}
        className="group relative cursor-pointer select-none rounded-3xl p-[2px] transition-transform duration-200"
        style={{
          transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          background: `linear-gradient(135deg, ${option.primary} 0%, #FFFFFF 50%, ${option.secondary === "#D4A017" ? "#138808" : option.secondary} 100%)`,
          boxShadow:
            "0 30px 60px -20px oklch(0 0 0 / 0.7), 0 0 50px -10px oklch(0.74 0.13 80 / 0.25)",
        }}
      >
        <div className="relative h-full overflow-hidden rounded-[1.4rem] bg-[oklch(0.14_0.05_285_/_0.92)] p-8 backdrop-blur-md">
          {/* Hover glow */}
          <div
            className="pointer-events-none absolute -inset-px rounded-[1.4rem] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${option.primary}40, transparent 70%)`,
            }}
          />

          {/* corner medallions */}
          {["left-3 top-3", "right-3 top-3", "left-3 bottom-3", "right-3 bottom-3"].map((p) => (
            <span
              key={p}
              className={`absolute ${p} h-2 w-2 rounded-full bg-[var(--gold)] shadow-[0_0_8px_var(--gold)]`}
            />
          ))}

          <div className="relative flex items-start gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl"
              style={{
                background:
                  "linear-gradient(180deg, oklch(0.22 0.08 285), oklch(0.16 0.06 285))",
                border: "1px solid oklch(0.74 0.13 80 / 0.5)",
                boxShadow:
                  "inset 0 0 14px oklch(0.74 0.13 80 / 0.25), 0 0 24px oklch(0.74 0.13 80 / 0.2)",
              }}
            >
              <span style={{ color: option.primary, filter: "drop-shadow(0 0 6px " + option.primary + ")" }}>{option.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="font-body text-[10px] uppercase tracking-[0.4em] text-[var(--gold-soft)]/70">
                {option.hindi}
              </p>
              <h2 className="text-gold-glow mt-1 font-display text-2xl md:text-3xl">
                {option.title}
              </h2>
            </div>
          </div>

          <p className="relative mt-5 font-serif text-base italic leading-relaxed text-[var(--foreground)]/85">
            {option.blurb}
          </p>

          <ul className="relative mt-6 space-y-2">
            {option.bullets.map((b) => (
              <li
                key={b}
                className="flex items-center gap-3 font-body text-sm text-[var(--foreground)]/80"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: option.primary, boxShadow: `0 0 8px ${option.primary}` }}
                />
                {b}
              </li>
            ))}
          </ul>

          <div className="relative mt-8 flex items-center justify-between">
            <span className="font-body text-xs uppercase tracking-[0.35em] text-[var(--gold-soft)]/60">
              Tap to begin
            </span>
            <span
              className="font-display text-xl text-[var(--gold)] transition-transform duration-300 group-hover:translate-x-2"
              aria-hidden
            >
              →
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
