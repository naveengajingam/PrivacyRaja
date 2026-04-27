import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { SceneShell } from "@/components/SceneShell";
import { AVATARS, type ElementId } from "@/game/avatars";
import { usePregameStore } from "@/store/usePregameStore";
import { useGameStore } from "@/store/useGameStore";
import { useEffect } from "react";

export const Route = createFileRoute("/avatar-select")({
  head: () => ({
    meta: [
      { title: "Choose Your Element — Privacy Raja" },
      { name: "description", content: "Pick one of the five Pancha Mahabhuta avatars." },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const players = usePregameStore((s) => s.players);
  const currentIdx = usePregameStore((s) => s.currentPickerIdx);
  const pickAvatar = usePregameStore((s) => s.pickAvatar);
  const initPregame = usePregameStore((s) => s.init);
  const playerCount = useGameStore((s) => s.playerCount);
  const setupGame = useGameStore((s) => s.setupPlayers);

  // If user reached this page directly, init based on store playerCount
  useEffect(() => {
    if (players.length === 0) initPregame(playerCount);
  }, [players.length, playerCount, initPregame]);

  const allDone = players.length > 0 && players.every((p) => p.avatar);
  const currentPlayer = players[currentIdx];

  function startBattle() {
    const defs = players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar as ElementId,
    }));
    setupGame(defs);
    navigate({ to: "/game" });
  }

  return (
    <SceneShell>
      <main className="flex min-h-screen flex-col items-center px-6 py-10">
        <header className="mb-6 text-center">
          <p className="mb-2 font-body text-xs uppercase tracking-[0.5em] text-[var(--gold-soft)]/70">
            Pancha Mahabhuta
          </p>
          <h1 className="text-gold-glow font-display text-3xl md:text-5xl">Choose Your Element</h1>
          <div
            className="mx-auto mt-4 h-[3px] w-40 rounded-full"
            style={{
              background: "linear-gradient(90deg, #FF9933 0% 33.3%, #FFFFFF 33.3% 66.6%, #138808 66.6% 100%)",
            }}
          />
        </header>

        {/* Status pills */}
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {players.map((p, i) => (
            <span
              key={p.id}
              className={`rounded-full border px-3 py-1 font-body text-xs uppercase tracking-[0.3em] ${
                i === currentIdx && !allDone
                  ? "border-[var(--gold)] bg-[var(--gold)]/20 text-[var(--gold)]"
                  : p.avatar
                    ? "border-[var(--india-green)]/60 text-[var(--india-green)]"
                    : "border-[var(--gold-soft)]/30 text-[var(--gold-soft)]/60"
              }`}
            >
              {p.name} {p.avatar ? `· ${AVATARS.find(a => a.id === p.avatar)?.name}` : ""}
            </span>
          ))}
        </div>

        {/* Picker prompt */}
        <AnimatePresence mode="wait">
          {!allDone && currentPlayer && (
            <motion.p
              key={currentIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="ember-text mb-8 text-center font-serif text-lg italic text-[var(--saffron)]"
            >
              {currentPlayer.name}, pick your avatar
            </motion.p>
          )}
        </AnimatePresence>

        <div className="grid w-full max-w-6xl grid-cols-2 gap-4 md:grid-cols-5">
          {AVATARS.map((a, i) => {
            const taken = players.find((p) => p.avatar === a.id);
            const disabled = !!taken || allDone;
            return (
              <motion.button
                key={a.id}
                disabled={disabled}
                onClick={() => pickAvatar(a.id)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.5 }}
                whileHover={disabled ? {} : { y: -6, scale: 1.02 }}
                className="group relative rounded-2xl p-[2px] text-left transition disabled:opacity-40"
                style={{
                  background: `linear-gradient(135deg, ${a.color} 0%, #FFFFFF 50%, ${a.glow} 100%)`,
                }}
              >
                <div className="relative h-full overflow-hidden rounded-[1rem] bg-[oklch(0.14_0.05_285_/_0.95)] p-5 backdrop-blur-md">
                  <div
                    className="mb-3 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl"
                    style={{
                      background: "linear-gradient(180deg, oklch(0.22 0.08 285), oklch(0.14 0.05 285))",
                      border: `1px solid ${a.color}`,
                      boxShadow: `0 0 18px ${a.glow}55, inset 0 0 12px ${a.color}33`,
                    }}
                  >
                    <span style={{ filter: `drop-shadow(0 0 6px ${a.glow})` }}>{a.symbol}</span>
                  </div>
                  <h3 className="font-display text-xl text-gold-glow">{a.name}</h3>
                  <p className="font-body text-[10px] uppercase tracking-[0.3em] text-[var(--gold-soft)]/70">
                    {a.english}
                  </p>
                  <p className="mt-3 font-serif text-sm italic leading-snug text-[var(--foreground)]/80">
                    {a.movement}
                  </p>
                  {taken && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-[1rem] bg-[oklch(0.13_0.04_285_/_0.85)]">
                      <span className="rounded-full border border-[var(--gold)]/60 px-3 py-1 font-body text-xs uppercase tracking-[0.3em] text-[var(--gold)]">
                        {taken.name}
                      </span>
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-10 flex items-center gap-6">
          <Link to="/multiplayer-setup" className="text-xs uppercase tracking-[0.4em] text-[var(--gold-soft)]/60 hover:text-[var(--gold)]">
            ← Back
          </Link>
          {allDone && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={startBattle}
              className="animate-pulse-glow rounded-full px-8 py-4 font-display text-lg tracking-widest text-[oklch(0.13_0.04_285)]"
              style={{
                background: "linear-gradient(180deg, #FFE9A8 0%, #D4A017 60%, #8a6510 100%)",
                border: "1px solid #FFE9A8",
              }}
            >
              ⚔ START BATTLE
            </motion.button>
          )}
        </div>
      </main>
    </SceneShell>
  );
}
