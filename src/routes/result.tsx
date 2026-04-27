import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { SceneShell } from "@/components/SceneShell";
import { useGameStore } from "@/store/useGameStore";
import { usePregameStore } from "@/store/usePregameStore";
import { getAvatar } from "@/game/avatars";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [
      { title: "Verdict of the Realm — Privacy Raja" },
      { name: "description", content: "Who shall be crowned Privacy Raja?" },
    ],
  }),
  component: ResultPage,
});

function fireTriColourConfetti() {
  const colors = ["#FF9933", "#FFFFFF", "#138808", "#D4A017"];
  const burst = (origin: { x: number; y: number }) => {
    confetti({ particleCount: 80, spread: 70, origin, colors, scalar: 1.1, ticks: 220 });
  };
  burst({ x: 0.2, y: 0.4 });
  burst({ x: 0.5, y: 0.3 });
  burst({ x: 0.8, y: 0.4 });
  setTimeout(() => burst({ x: 0.5, y: 0.5 }), 350);
  setTimeout(() => burst({ x: 0.3, y: 0.6 }), 600);
  setTimeout(() => burst({ x: 0.7, y: 0.6 }), 750);
}

function ResultPage() {
  const navigate = useNavigate();
  const players = useGameStore((s) => s.players);
  const tileStates = useGameStore((s) => s.tileStates);
  const winnerId = useGameStore((s) => s.winnerId);
  const resetGame = useGameStore((s) => s.resetGame);
  const resetPregame = usePregameStore((s) => s.reset);

  // Winner: explicit winnerId, else richest non-bankrupt
  const winner =
    players.find((p) => p.id === winnerId) ??
    [...players].sort((a, b) => Number(a.isBankrupt) - Number(b.isBankrupt) || b.cash - a.cash)[0];

  useEffect(() => {
    if (winner) fireTriColourConfetti();
  }, [winner]);

  // Per-player layer counts
  const layersBy = (pid: string) =>
    tileStates.filter((s) => s.ownerId === pid).reduce((acc, s) => acc + s.layers, 0);

  function rematch() {
    // keep avatars, restart game with same lineup
    const defs = players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar!,
    }));
    resetGame();
    useGameStore.getState().setupPlayers(defs);
    navigate({ to: "/game" });
  }

  function newGame() {
    resetGame();
    resetPregame();
    navigate({ to: "/" });
  }

  function share() {
    const text = `🏆 ${winner?.name} (${getAvatar(winner?.avatar)?.name}) was crowned Privacy Raja with ₹${winner?.cash}!`;
    if (navigator.share) {
      navigator.share({ title: "Privacy Raja", text }).catch(() => void 0);
    } else {
      navigator.clipboard.writeText(text).then(() => useGameStore.getState().pushToast("Copied to clipboard", "gold"));
    }
  }

  if (!winner) {
    return (
      <SceneShell>
        <main className="flex min-h-screen items-center justify-center px-6 py-16">
          <div className="text-center">
            <p className="font-serif italic text-[var(--gold-soft)]">No verdict yet — return to the hall.</p>
            <Link to="/" className="mt-4 inline-block text-xs uppercase tracking-[0.4em] text-[var(--gold)]">← Hall</Link>
          </div>
        </main>
      </SceneShell>
    );
  }

  const av = getAvatar(winner.avatar);

  return (
    <SceneShell>
      <main className="flex min-h-screen flex-col items-center px-6 py-12">
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-body text-xs uppercase tracking-[0.5em] text-[var(--gold-soft)]/70"
        >
          Verdict of the Realm
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 14 }}
          className="text-gold-glow mt-1 font-display text-5xl md:text-7xl"
        >
          PRIVACY RAJA
        </motion.h1>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-8 rounded-3xl p-[2px]"
          style={{
            background: "linear-gradient(135deg, #FF9933 0%, #FFFFFF 50%, #138808 100%)",
            boxShadow: "0 0 60px oklch(0.74 0.13 80 / 0.5)",
          }}
        >
          <div className="rounded-[1.4rem] bg-[oklch(0.14_0.05_285_/_0.95)] px-10 py-8 text-center">
            <div
              className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl text-5xl"
              style={{
                background: "linear-gradient(180deg, oklch(0.22 0.08 285), oklch(0.14 0.05 285))",
                border: `2px solid ${av?.color ?? "#D4A017"}`,
                boxShadow: `0 0 32px ${av?.glow ?? "#D4A017"}`,
              }}
            >
              {av?.symbol ?? "👑"}
            </div>
            <h2 className="text-gold-glow font-display text-3xl">{winner.name}</h2>
            <div className="mt-1 font-serif italic text-[var(--saffron)]">
              {av?.name} · {av?.english}
            </div>
            <div className="mt-4 font-display text-2xl text-[var(--gold)]">
              ₹{winner.cash}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-3 md:grid-cols-2"
        >
          {players.map((p) => {
            const a = getAvatar(p.avatar);
            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-4 ${
                  p.id === winner.id
                    ? "border-[var(--gold)]/70 bg-[oklch(0.18_0.06_285)]"
                    : "border-[var(--gold)]/20 bg-[oklch(0.14_0.05_285_/_0.85)]"
                }`}
              >
                <div className="mb-2 flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-lg"
                    style={{ background: a?.color, boxShadow: `0 0 8px ${a?.glow}` }}
                  >
                    {a?.symbol}
                  </span>
                  <div>
                    <div className="font-display text-sm text-[var(--gold)]">{p.name}</div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold-soft)]/60">
                      {a?.name} {p.isBankrupt ? "· Bankrupt" : ""}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <Stat label="Cash" value={`₹${p.cash}`} />
                  <Stat label="Tiles" value={String(p.ownedTiles.length)} />
                  <Stat label="Layers" value={String(layersBy(p.id))} />
                  <Stat label="MCQs" value={`${p.mcqsCorrect}/${p.mcqsTotal}`} />
                </div>
              </div>
            );
          })}
        </motion.div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={rematch}
            className="rounded-full px-6 py-3 font-display text-sm tracking-widest text-[oklch(0.13_0.04_285)]"
            style={{ background: "linear-gradient(180deg, #FFE9A8 0%, #D4A017 60%, #8a6510 100%)" }}
          >
            ⚔ REMATCH
          </button>
          <button
            onClick={newGame}
            className="rounded-full border border-[var(--gold)]/40 px-6 py-3 font-display text-sm tracking-widest text-[var(--gold)] hover:bg-[var(--gold)]/10"
          >
            NEW GAME
          </button>
          <button
            onClick={share}
            className="rounded-full border border-[var(--gold)]/40 px-6 py-3 font-display text-sm tracking-widest text-[var(--gold)] hover:bg-[var(--gold)]/10"
          >
            ↗ SHARE
          </button>
        </div>
      </main>
    </SceneShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--gold)]/20 px-1 py-1.5">
      <div className="text-[8px] uppercase tracking-[0.25em] text-[var(--gold-soft)]/60">{label}</div>
      <div className="font-display text-sm text-[var(--gold)]">{value}</div>
    </div>
  );
}
