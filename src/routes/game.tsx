import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { SceneShell } from "@/components/SceneShell";
import { useGameStore } from "@/store/useGameStore";
import { TILES, type Tile } from "@/game/tiles";
import { getAvatar, type ElementId } from "@/game/avatars";
import { loadMcqBank, getMcqForPrinciple, type MCQ } from "@/game/mcqService";
import Board3D from "@/components/board3d/Board3D";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "The Battlefield — Privacy Raja" },
      { name: "description", content: "Roll the fire-dice. Conquer the principles." },
    ],
  }),
  component: GameScreen,
});

// =====================================================
// Top-level Game Screen
// =====================================================
function GameScreen() {
  const navigate = useNavigate();
  const phase = useGameStore((s) => s.phase);
  const players = useGameStore((s) => s.players);
  const setupPlayers = useGameStore((s) => s.setupPlayers);
  const winnerId = useGameStore((s) => s.winnerId);

  // Wire audio: ambient loop + SFX on phase/state transitions
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@/hooks/useAudioBridge").useAudioBridge();

  // Safety: if user lands on /game without setup, push them to avatar select
  useEffect(() => {
    if (players.length === 0) {
      navigate({ to: "/avatar-select" });
    }
  }, [players.length, navigate]);

  // Navigate to result when game ends
  useEffect(() => {
    if (phase === "gameover") {
      const id = setTimeout(() => navigate({ to: "/result" }), 600);
      return () => clearTimeout(id);
    }
  }, [phase, navigate, winnerId]);

  // MCQ bank load
  const [bank, setBank] = useState<MCQ[] | null>(null);
  useEffect(() => {
    loadMcqBank().then(setBank).catch(console.error);
  }, []);

  if (players.length === 0) return null;
  void setupPlayers;

  return (
    <SceneShell>
      <div className="relative flex min-h-screen flex-col">
        <TopHud />
        <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:flex-row md:px-6">
          <LeftPanel />
          <BoardArea bank={bank} />
          <RightPanel />
        </div>
        <ToastStack />
        <ModalLayer bank={bank} />
      </div>
    </SceneShell>
  );
}

// =====================================================
// Top HUD
// =====================================================
function TopHud() {
  const round = useGameStore((s) => s.round);
  const players = useGameStore((s) => s.players);
  const idx = useGameStore((s) => s.currentPlayerIndex);
  const dice = useGameStore((s) => s.dice);
  const player = players[idx];
  const av = getAvatar(player?.avatar);

  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-4 py-3 md:px-8">
      <div className="flex items-center gap-3">
        <div className="font-body text-[10px] uppercase tracking-[0.4em] text-[var(--gold-soft)]/70">
          Round
        </div>
        <div className="font-display text-2xl text-gold-glow">{round}</div>
      </div>

      <div className="flex items-center gap-3 rounded-full border border-[var(--gold)]/40 bg-[oklch(0.14_0.05_285_/_0.85)] px-4 py-2 backdrop-blur-md">
        {av && (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-base"
            style={{ background: av.color, boxShadow: `0 0 10px ${av.glow}` }}
          >
            {av.symbol}
          </span>
        )}
        <span className="font-display text-sm text-[var(--gold)]">{player?.name}</span>
        <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold-soft)]/60">
          {av?.english}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-body text-[10px] uppercase tracking-[0.4em] text-[var(--gold-soft)]/70">
          Last Roll
        </span>
        <motion.span
          key={dice.value}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 12 }}
          className="font-display text-3xl"
          style={{
            color: "#FF9933",
            textShadow: "0 0 16px #FF9933, 0 0 32px #D4A017",
          }}
        >
          {dice.value}
        </motion.span>
      </div>
    </header>
  );
}

// =====================================================
// Left Panel — current player details
// =====================================================
function LeftPanel() {
  const players = useGameStore((s) => s.players);
  const idx = useGameStore((s) => s.currentPlayerIndex);
  const tileStates = useGameStore((s) => s.tileStates);
  const player = players[idx];
  const av = getAvatar(player?.avatar);
  if (!player) return null;

  const grouped = {
    saffron: [] as { tile: Tile; layers: number }[],
    white: [] as { tile: Tile; layers: number }[],
    green: [] as { tile: Tile; layers: number }[],
  };
  for (const idx of player.ownedTiles) {
    const t = TILES[idx];
    if (t.colorGroup) {
      const ts = tileStates.find((s) => s.tileIndex === idx);
      grouped[t.colorGroup].push({ tile: t, layers: ts?.layers ?? 0 });
    }
  }

  return (
    <aside className="w-full shrink-0 rounded-2xl border border-[var(--gold)]/30 bg-[oklch(0.14_0.05_285_/_0.85)] p-4 backdrop-blur-md md:w-64">
      <div className="mb-4 flex items-center gap-3">
        {av && (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
            style={{
              background: "linear-gradient(180deg, oklch(0.22 0.08 285), oklch(0.14 0.05 285))",
              border: `1px solid ${av.color}`,
              boxShadow: `0 0 12px ${av.glow}`,
            }}
          >
            {av.symbol}
          </div>
        )}
        <div>
          <div className="font-display text-lg text-gold-glow">{player.name}</div>
          <div className="font-body text-[10px] uppercase tracking-[0.3em] text-[var(--gold-soft)]/70">
            {av?.name} · {av?.english}
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-[var(--gold)]/25 bg-[oklch(0.18_0.05_285)] p-3">
        <div className="font-body text-[10px] uppercase tracking-[0.3em] text-[var(--gold-soft)]/70">Cash</div>
        <div className="font-display text-2xl text-[var(--saffron)] ember-text">
          ₹{player.cash}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Stat label="Skip Tokens" value={String(player.mcqSkipTokens)} />
        <Stat label="MCQs Won" value={`${player.mcqsCorrect}/${player.mcqsTotal}`} />
      </div>

      <div className="mb-2 mt-4 font-body text-[10px] uppercase tracking-[0.3em] text-[var(--gold-soft)]/70">
        Owned Principles
      </div>
      {(["saffron", "white", "green"] as const).map((g) => (
        <div key={g} className="mb-2">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="h-2 w-6 rounded-full"
              style={{ background: g === "saffron" ? "#FF9933" : g === "white" ? "#FFFFFF" : "#138808" }}
            />
            <span className="font-body text-[10px] uppercase tracking-[0.3em] text-[var(--foreground)]/60">{g}</span>
          </div>
          {grouped[g].length === 0 ? (
            <div className="text-xs text-[var(--foreground)]/40">—</div>
          ) : (
            grouped[g].map(({ tile, layers }) => (
              <div key={tile.index} className="flex items-center justify-between rounded-md px-2 py-1 text-xs text-[var(--foreground)]/85">
                <span className="truncate">{tile.name}</span>
                <span className="text-[var(--gold)]">{"●".repeat(layers) || "·"}</span>
              </div>
            ))
          )}
        </div>
      ))}
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--gold)]/20 px-2 py-1.5">
      <div className="font-body text-[9px] uppercase tracking-[0.25em] text-[var(--gold-soft)]/60">{label}</div>
      <div className="font-display text-sm text-[var(--gold)]">{value}</div>
    </div>
  );
}

// =====================================================
// Right Panel — event log
// =====================================================
function RightPanel() {
  const log = useGameStore((s) => s.log);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: 1e6, behavior: "smooth" });
  }, [log.length]);
  return (
    <aside className="w-full shrink-0 rounded-2xl border border-[var(--gold)]/30 bg-[oklch(0.14_0.05_285_/_0.85)] p-4 backdrop-blur-md md:w-64">
      <div className="mb-3 font-body text-[10px] uppercase tracking-[0.4em] text-[var(--gold-soft)]/70">
        Battle Chronicle
      </div>
      <div ref={ref} className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1 text-xs leading-relaxed">
        {log.map((line, i) => (
          <div
            key={i}
            className="rounded-md border border-transparent px-2 py-1 text-[var(--foreground)]/80 hover:border-[var(--gold)]/20"
          >
            {line}
          </div>
        ))}
      </div>
    </aside>
  );
}

// =====================================================
// Board Area — 11x11 grid with tiles, avatars, dice center
// =====================================================
function BoardArea({ bank }: { bank: MCQ[] | null }) {
  const players = useGameStore((s) => s.players);
  const tileStates = useGameStore((s) => s.tileStates);
  const idx = useGameStore((s) => s.currentPlayerIndex);
  const phase = useGameStore((s) => s.phase);
  const dice = useGameStore((s) => s.dice);
  const rollDice = useGameStore((s) => s.rollDice);
  const finishMovement = useGameStore((s) => s.finishMovement);
  const resolveLanding = useGameStore((s) => s.resolveLanding);
  const endTurn = useGameStore((s) => s.endTurn);
  const setMcqContext = useGameStore((s) => s.setMcqContext);
  const round = useGameStore((s) => s.round);

  // Animate avatar movement tile-by-tile when phase = 'moving'
  const [animatingPos, setAnimatingPos] = useState<Record<string, number>>({});
  useEffect(() => {
    // initial placement
    const init: Record<string, number> = {};
    for (const p of players) init[p.id] = p.position;
    setAnimatingPos(init);
  }, [players.length]);

  useEffect(() => {
    if (phase !== "moving") return;
    const player = players[idx];
    if (!player) return;
    const startPos = animatingPos[player.id] ?? player.position;
    const targetPos = (startPos + dice.value) % 28;
    let cur = startPos;
    let cancelled = false;
    function step() {
      if (cancelled) return;
      cur = (cur + 1) % 28;
      setAnimatingPos((prev) => ({ ...prev, [player.id]: cur }));
      if (cur === targetPos) {
        // commit
        setTimeout(() => {
          if (!cancelled) finishMovement();
        }, 250);
      } else {
        setTimeout(step, 320);
      }
    }
    setTimeout(step, 200);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // After finishMovement → phase = 'resolving' → resolve once
  useEffect(() => {
    if (phase !== "resolving") return;
    const tile = resolveLanding();
    // If the resolved tile required MCQ, populate the question
    setTimeout(() => {
      const ctx = useGameStore.getState().mcq;
      if (ctx && bank && tile.principleId) {
        const q = getMcqForPrinciple(bank, tile.principleId, round);
        if (q) {
          setMcqContext({
            ...ctx,
            questionId: q.id,
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            principle: q.principle,
          });
        }
      }
    }, 50);
  }, [phase, resolveLanding, bank, round, setMcqContext]);

  // Auto-end turn after a beat when phase = 'turn-end'
  useEffect(() => {
    if (phase !== "turn-end") return;
    // sync animating pos to actual after turn end
    const t = setTimeout(() => {
      setAnimatingPos((prev) => {
        const next = { ...prev };
        for (const p of players) next[p.id] = p.position;
        return next;
      });
      endTurn();
    }, 900);
    return () => clearTimeout(t);
  }, [phase, endTurn, players]);

  // Player markers grouped by displayed tile
  const playersByTile = useMemo(() => {
    const map: Record<number, typeof players> = {};
    for (const p of players) {
      if (p.isBankrupt) continue;
      const pos = animatingPos[p.id] ?? p.position;
      (map[pos] ||= []).push(p);
    }
    return map;
  }, [players, animatingPos]);

  // Build ownerColors map for 3D board
  const ownerColors = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of players) {
      const av = getAvatar(p.avatar);
      if (av) m[p.id] = av.color;
    }
    return m;
  }, [players]);

  const activeElement: ElementId | null = (players[idx]?.avatar ?? null) as ElementId | null;
  const highlightTile = phase === "resolving" || phase === "mcq" || phase === "buying" || phase === "building" || phase === "card" || phase === "tax"
    ? players[idx]?.position ?? null
    : null;

  // 'positions' map for Board3D (displayed tile per player)
  const displayedPositions = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of players) m[p.id] = animatingPos[p.id] ?? p.position;
    return m;
  }, [players, animatingPos]);

  return (
    <div className="relative flex flex-1 items-center justify-center">
      <div
        className="relative aspect-square w-full max-w-[min(78vh,720px)] overflow-hidden rounded-3xl border-2 border-[var(--gold)]/40 shadow-[0_30px_80px_-20px_oklch(0_0_0_/_0.7)]"
        style={{
          background:
            "radial-gradient(circle at center, oklch(0.18 0.07 285) 0%, oklch(0.06 0.02 285) 100%)",
        }}
      >
        <Board3D
          players={players.map((p) => ({ id: p.id, avatar: p.avatar, isBankrupt: p.isBankrupt }))}
          tileStates={tileStates}
          positions={displayedPositions}
          highlightTile={highlightTile}
          ownerColors={ownerColors}
          diceValue={dice.value}
          isRolling={dice.isRolling}
          onRollDice={rollDice}
          canRoll={phase === "rolling"}
          activeElement={activeElement}
        />

        {/* Phase indicator + fallback roll button (bottom-center overlay) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-2">
          <div className="pointer-events-auto rounded-full border border-[var(--gold)]/30 bg-[oklch(0.1_0.03_285_/_0.85)] px-4 py-1.5 backdrop-blur-md">
            <span className="font-body text-[9px] uppercase tracking-[0.4em] text-[var(--gold-soft)]/70 mr-2">Phase</span>
            <span className="font-display text-sm text-[var(--gold)]">{phase}</span>
          </div>
          {phase === "rolling" && (
            <button
              onClick={rollDice}
              disabled={dice.isRolling}
              className="pointer-events-auto rounded-full px-6 py-2 font-display text-sm tracking-widest text-[oklch(0.13_0.04_285)] shadow-[0_0_24px_rgba(255,153,51,0.6)] disabled:opacity-60"
              style={{ background: "linear-gradient(180deg, #FFE9A8 0%, #D4A017 60%, #8a6510 100%)" }}
            >
              {dice.isRolling ? "Rolling…" : "⚡ Tap Fire-Die"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// (2D tile/dice helpers removed — replaced by Board3D)


// =====================================================
// Modal Layer
// =====================================================
function ModalLayer({ bank }: { bank: MCQ[] | null }) {
  const phase = useGameStore((s) => s.phase);
  const mcq = useGameStore((s) => s.mcq);
  const buy = useGameStore((s) => s.buy);
  const build = useGameStore((s) => s.build);
  const card = useGameStore((s) => s.card);
  const tax = useGameStore((s) => s.tax);

  return (
    <AnimatePresence>
      {phase === "mcq" && mcq && mcq.question && <MCQModal />}
      {phase === "buying" && buy && <BuyModal />}
      {phase === "building" && build && <BuildModal />}
      {phase === "card" && card && <CardModal />}
      {phase === "tax" && tax && <TaxModal />}
    </AnimatePresence>
  );
  void bank;
}

function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.05_0.02_285_/_0.75)] p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="relative w-full max-w-lg rounded-3xl p-[2px]"
        style={{
          background: "linear-gradient(135deg, #FF9933 0%, #FFFFFF 50%, #138808 100%)",
        }}
      >
        <div className="relative rounded-[1.4rem] bg-[oklch(0.14_0.05_285_/_0.97)] p-7">
          {["left-3 top-3", "right-3 top-3", "left-3 bottom-3", "right-3 bottom-3"].map((p) => (
            <span key={p} className={`absolute ${p} h-2 w-2 rounded-full bg-[var(--gold)] shadow-[0_0_8px_var(--gold)]`} />
          ))}
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function MCQModal() {
  const mcq = useGameStore((s) => s.mcq)!;
  const answer = useGameStore((s) => s.answerMcq);
  const useSkip = useGameStore((s) => s.useSkipToken);
  const players = useGameStore((s) => s.players);
  const idx = useGameStore((s) => s.currentPlayerIndex);
  const player = players[idx];
  const tile = TILES[mcq.tileIndex];

  return (
    <ModalShell>
      <div className="mb-2 font-body text-[10px] uppercase tracking-[0.4em] text-[var(--gold-soft)]/70">
        Principle Challenge · {tile.name}
      </div>
      <h2 className="text-gold-glow mb-1 font-display text-xl">
        {mcq.reason === "purchase" ? "Answer to Acquire" : `Answer to Waive ₹${mcq.rentOwed} Rent`}
      </h2>
      <p className="mb-5 font-serif text-[var(--foreground)]/90">{mcq.question}</p>
      <div className="space-y-2">
        {mcq.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => answer(i)}
            className="group block w-full rounded-xl border border-[var(--gold)]/25 bg-[oklch(0.18_0.05_285)] px-4 py-3 text-left text-sm transition hover:border-[var(--gold)]/70 hover:bg-[oklch(0.22_0.06_285)]"
          >
            <span className="mr-2 inline-block w-5 font-display text-[var(--gold)]">
              {String.fromCharCode(65 + i)}.
            </span>
            <span className="text-[var(--foreground)]/90">{opt}</span>
          </button>
        ))}
      </div>
      {player.mcqSkipTokens > 0 && (
        <button
          onClick={() => useSkip()}
          className="mt-4 rounded-full border border-[var(--gold)]/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] hover:bg-[var(--gold)]/10"
        >
          Use Skip Token ({player.mcqSkipTokens})
        </button>
      )}
    </ModalShell>
  );
}

function BuyModal() {
  const buy = useGameStore((s) => s.buy)!;
  const buyTile = useGameStore((s) => s.buyTile);
  const tile = TILES[buy.tileIndex];
  const players = useGameStore((s) => s.players);
  const idx = useGameStore((s) => s.currentPlayerIndex);
  const cash = players[idx].cash;
  const canAfford = cash >= buy.price;
  return (
    <ModalShell>
      <div className="mb-2 font-body text-[10px] uppercase tracking-[0.4em] text-[var(--gold-soft)]/70">
        Acquire Principle
      </div>
      <h2 className="text-gold-glow mb-3 font-display text-2xl">{tile.name}</h2>
      <p className="mb-5 font-serif italic text-[var(--foreground)]/85">
        Claim this tile for ₹{buy.price}? Owning it grants rent on opponent visits and unlocks Compliance Layers when you control the full {tile.colorGroup} group.
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={() => buyTile(false)}
          className="rounded-full border border-[var(--gold)]/30 px-5 py-2 font-body text-sm text-[var(--gold-soft)]/80 hover:bg-[var(--gold)]/5"
        >
          Decline
        </button>
        <button
          onClick={() => buyTile(true)}
          disabled={!canAfford}
          className="rounded-full px-5 py-2 font-display text-sm text-[oklch(0.13_0.04_285)] disabled:opacity-50"
          style={{
            background: "linear-gradient(180deg, #FFE9A8 0%, #D4A017 60%, #8a6510 100%)",
          }}
        >
          {canAfford ? `Buy for ₹${buy.price}` : "Not enough cash"}
        </button>
      </div>
    </ModalShell>
  );
}

function BuildModal() {
  const build = useGameStore((s) => s.build)!;
  const buildLayer = useGameStore((s) => s.buildLayer);
  const tile = TILES[build.tileIndex];
  return (
    <ModalShell>
      <div className="mb-2 font-body text-[10px] uppercase tracking-[0.4em] text-[var(--gold-soft)]/70">
        Build Compliance Layer {build.currentLayers + 1}
      </div>
      <h2 className="text-gold-glow mb-3 font-display text-2xl">{tile.name}</h2>
      <p className="mb-5 font-serif italic text-[var(--foreground)]/85">
        Reinforce this principle for ₹{build.cost}. Rent multiplier rises to ×{[2, 4, 8, 16][build.currentLayers]}.
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={() => buildLayer(false)}
          className="rounded-full border border-[var(--gold)]/30 px-5 py-2 font-body text-sm text-[var(--gold-soft)]/80"
        >
          Skip
        </button>
        <button
          onClick={() => buildLayer(true)}
          className="rounded-full px-5 py-2 font-display text-sm text-[oklch(0.13_0.04_285)]"
          style={{ background: "linear-gradient(180deg, #FFE9A8 0%, #D4A017 60%, #8a6510 100%)" }}
        >
          Build for ₹{build.cost}
        </button>
      </div>
    </ModalShell>
  );
}

function CardModal() {
  const card = useGameStore((s) => s.card)!;
  const apply = useGameStore((s) => s.applyCard);
  const isBonus = card.deck === "bonus";
  return (
    <ModalShell>
      <div
        className="mb-2 font-body text-[10px] uppercase tracking-[0.4em]"
        style={{ color: isBonus ? "#138808" : "#FF9933" }}
      >
        {isBonus ? "Compliance Bonus" : "Data Breach"}
      </div>
      <h2 className="text-gold-glow mb-3 font-display text-2xl">
        {isBonus ? "🌟 Reward of the Realm" : "⚠ Breach Detected"}
      </h2>
      <p className="mb-6 font-serif text-lg italic text-[var(--foreground)]/90">{card.card.text}</p>
      <div className="flex justify-end">
        <button
          onClick={apply}
          className="rounded-full px-6 py-2 font-display text-sm text-[oklch(0.13_0.04_285)]"
          style={{ background: "linear-gradient(180deg, #FFE9A8 0%, #D4A017 60%, #8a6510 100%)" }}
        >
          Accept Fate →
        </button>
      </div>
    </ModalShell>
  );
}

function TaxModal() {
  const tax = useGameStore((s) => s.tax)!;
  const apply = useGameStore((s) => s.applyTax);
  return (
    <ModalShell>
      <div className="mb-2 font-body text-[10px] uppercase tracking-[0.4em] text-[var(--saffron)]">
        DPDPA Penalty
      </div>
      <h2 className="text-gold-glow mb-3 font-display text-2xl">⚖ {TILES[tax.tileIndex].name}</h2>
      <p className="mb-6 font-serif italic text-lg text-[var(--foreground)]/90">
        The Board levies a penalty of ₹{tax.amount}.
      </p>
      <div className="flex justify-end">
        <button
          onClick={apply}
          className="rounded-full px-6 py-2 font-display text-sm text-[oklch(0.13_0.04_285)]"
          style={{ background: "linear-gradient(180deg, #FFE9A8 0%, #D4A017 60%, #8a6510 100%)" }}
        >
          Pay ₹{tax.amount}
        </button>
      </div>
    </ModalShell>
  );
}

// =====================================================
// Toast Stack
// =====================================================
function ToastStack() {
  const toasts = useGameStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => {
          const tone =
            t.tone === "success" ? "#138808" :
            t.tone === "danger" ? "#c0392b" :
            t.tone === "gold" ? "#D4A017" : "#1A1A4E";
          return (
            <motion.div
              key={t.id}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="rounded-full px-4 py-2 text-xs"
              style={{
                background: `linear-gradient(180deg, ${tone}, oklch(0.14 0.05 285))`,
                border: `1px solid ${tone}`,
                boxShadow: `0 0 20px ${tone}55`,
                color: "#fff",
              }}
            >
              {t.text}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
