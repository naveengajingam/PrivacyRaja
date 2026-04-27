import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { SceneShell } from "@/components/SceneShell";
import { useGameStore } from "@/store/useGameStore";
import { usePregameStore } from "@/store/usePregameStore";

export const Route = createFileRoute("/multiplayer-setup")({
  head: () => ({
    meta: [
      { title: "Multiplayer Setup — Privacy Raja" },
      { name: "description", content: "Create a room, join one, or play locally." },
    ],
  }),
  component: Page,
});

type CardId = "create" | "join" | "local";

interface CardDef {
  id: CardId;
  title: string;
  hindi: string;
  blurb: string;
  icon: string;
  available: boolean;
  primary: string;
}

const CARDS: CardDef[] = [
  { id: "create", title: "Create Online Room", hindi: "नया रण", blurb: "Host a room. Share an invite code with allies.", icon: "🏯", available: false, primary: "#FF9933" },
  { id: "local",  title: "Local Pass-and-Play", hindi: "स्थानीय युद्ध", blurb: "Pass one device around the table.", icon: "🪔", available: true,  primary: "#D4A017" },
  { id: "join",   title: "Join Online Room",   hindi: "रण में पधारो", blurb: "Enter a code from a friend's invite.",       icon: "⚔",  available: false, primary: "#138808" },
];

function Page() {
  const [flipped, setFlipped] = useState<CardId | null>(null);
  return (
    <SceneShell>
      <main className="flex min-h-screen flex-col items-center px-6 py-12">
        <header className="mb-10 text-center">
          <p className="mb-3 font-body text-xs uppercase tracking-[0.5em] text-[var(--gold-soft)]/70">
            Summon The Allies
          </p>
          <h1 className="text-gold-glow font-display text-4xl md:text-6xl">
            Multiplayer Setup
          </h1>
          <div
            className="mx-auto mt-5 h-[3px] w-44 rounded-full"
            style={{
              background: "linear-gradient(90deg, #FF9933 0% 33.3%, #FFFFFF 33.3% 66.6%, #138808 66.6% 100%)",
              boxShadow: "0 0 14px oklch(0.74 0.13 80 / 0.5)",
            }}
          />
        </header>

        <div className="grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
          {CARDS.map((c, i) => (
            <FlipCard
              key={c.id}
              card={c}
              index={i}
              flipped={flipped === c.id}
              onFlip={() => setFlipped(flipped === c.id ? null : c.id)}
            />
          ))}
        </div>

        <div className="mt-10">
          <Link
            to="/mode-select"
            className="font-body text-xs uppercase tracking-[0.4em] text-[var(--gold-soft)]/60 transition hover:text-[var(--gold)]"
          >
            ← Change Mode
          </Link>
        </div>
      </main>
    </SceneShell>
  );
}

function FlipCard({ card, index, flipped, onFlip }: { card: CardDef; index: number; flipped: boolean; onFlip: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative h-[420px] [perspective:1200px]"
    >
      <button
        onClick={onFlip}
        className="relative h-full w-full cursor-pointer rounded-3xl text-left [transform-style:preserve-3d] transition-transform duration-700"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0)" }}
        aria-label={card.title}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-3xl p-[2px] [backface-visibility:hidden]"
          style={{
            background: `linear-gradient(135deg, ${card.primary} 0%, #FFFFFF 50%, ${card.primary} 100%)`,
            boxShadow: "0 30px 60px -20px oklch(0 0 0 / 0.7)",
          }}
        >
          <div className="relative h-full overflow-hidden rounded-[1.4rem] bg-[oklch(0.14_0.05_285_/_0.92)] p-7 backdrop-blur-md">
            {["left-3 top-3", "right-3 top-3", "left-3 bottom-3", "right-3 bottom-3"].map((p) => (
              <span key={p} className={`absolute ${p} h-2 w-2 rounded-full bg-[var(--gold)] shadow-[0_0_8px_var(--gold)]`} />
            ))}
            <div
              className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
              style={{
                background: "linear-gradient(180deg, oklch(0.22 0.08 285), oklch(0.16 0.06 285))",
                border: "1px solid oklch(0.74 0.13 80 / 0.5)",
                color: card.primary,
                filter: `drop-shadow(0 0 8px ${card.primary})`,
              }}
            >
              {card.icon}
            </div>
            <p className="font-body text-[10px] uppercase tracking-[0.4em] text-[var(--gold-soft)]/70">{card.hindi}</p>
            <h2 className="text-gold-glow mt-1 font-display text-2xl">{card.title}</h2>
            <p className="mt-4 font-serif italic text-[var(--foreground)]/80">{card.blurb}</p>

            <div className="absolute bottom-6 left-7 right-7 flex items-center justify-between">
              {card.available ? (
                <span className="font-body text-xs uppercase tracking-[0.35em] text-[var(--gold)]">Tap to begin →</span>
              ) : (
                <span className="font-body text-xs uppercase tracking-[0.35em] text-[var(--saffron)]/80">Coming next phase</span>
              )}
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-3xl p-[2px] [backface-visibility:hidden]"
          style={{
            transform: "rotateY(180deg)",
            background: `linear-gradient(135deg, ${card.primary} 0%, #FFFFFF 50%, ${card.primary} 100%)`,
          }}
        >
          <div className="relative h-full overflow-hidden rounded-[1.4rem] bg-[oklch(0.14_0.05_285_/_0.95)] p-7 backdrop-blur-md">
            {card.available ? <LocalSetup /> : <ComingSoon title={card.title} />}
          </div>
        </div>
      </button>
    </motion.div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-4 text-5xl">🛡</div>
      <h3 className="text-gold-glow font-display text-xl">{title}</h3>
      <p className="mt-3 font-serif italic text-[var(--foreground)]/75">
        Realtime online battles arrive in the next phase. Stand ready.
      </p>
    </div>
  );
}

function LocalSetup() {
  const navigate = useNavigate();
  const setMode = useGameStore((s) => s.setMode);
  const setPlayerCount = useGameStore((s) => s.setPlayerCount);
  const initPregame = usePregameStore((s) => s.init);
  const [count, setCount] = useState(2);

  function start(e: React.MouseEvent) {
    e.stopPropagation();
    setMode("local");
    setPlayerCount(count);
    initPregame(count);
    navigate({ to: "/avatar-select" });
  }

  return (
    <div className="flex h-full flex-col">
      <h3 className="text-gold-glow font-display text-xl">Local Pass-and-Play</h3>
      <p className="mt-2 font-serif italic text-sm text-[var(--foreground)]/75">
        How many warriors will share this device?
      </p>

      <div className="mt-6 grid grid-cols-4 gap-2">
        {[2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={(e) => { e.stopPropagation(); setCount(n); }}
            className={`rounded-xl border px-3 py-3 font-display text-2xl transition ${
              count === n
                ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold)]"
                : "border-[var(--gold)]/25 text-[var(--gold-soft)]/70 hover:border-[var(--gold)]/60"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={start}
          className="w-full rounded-full px-6 py-4 font-display text-lg tracking-widest text-[oklch(0.13_0.04_285)]"
          style={{
            background: "linear-gradient(180deg, #FFE9A8 0%, #D4A017 60%, #8a6510 100%)",
            border: "1px solid #FFE9A8",
            boxShadow: "0 0 30px oklch(0.74 0.13 80 / 0.5)",
          }}
        >
          PROCEED →
        </button>
        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.4em] text-[var(--gold-soft)]/50">
          Pass the device when prompted
        </p>
      </div>

      <AnimatePresence />
    </div>
  );
}
