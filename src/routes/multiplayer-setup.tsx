import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { SceneShell } from "@/components/SceneShell";
import { useGameStore } from "@/store/useGameStore";
import { usePregameStore } from "@/store/usePregameStore";
import { ensureAnonSession, createRoom, joinRoom, fetchRoomByCode } from "@/lib/online";
import { toast } from "sonner";

export const Route = createFileRoute("/multiplayer-setup")({
  head: () => ({
    meta: [
      { title: "Multiplayer Setup — Privacy Raja" },
      { name: "description", content: "Create a room, join one, or play locally." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    join: typeof s.join === "string" ? s.join : undefined,
  }),
  component: Page,
});

type CardId = "create" | "join" | "local";

function Page() {
  const search = Route.useSearch();
  const [active, setActive] = useState<CardId | null>(search.join ? "join" : null);

  return (
    <SceneShell>
      <main className="flex min-h-screen flex-col items-center px-6 py-12">
        <header className="mb-10 text-center">
          <p className="mb-3 font-body text-xs uppercase tracking-[0.5em] text-[var(--gold-soft)]/70">
            Summon The Allies
          </p>
          <h1 className="text-gold-glow font-display text-4xl md:text-6xl">Multiplayer Setup</h1>
          <div
            className="mx-auto mt-5 h-[3px] w-44 rounded-full"
            style={{
              background: "linear-gradient(90deg, #FF9933 0% 33.3%, #FFFFFF 33.3% 66.6%, #138808 66.6% 100%)",
              boxShadow: "0 0 14px oklch(0.74 0.13 80 / 0.5)",
            }}
          />
        </header>

        <div className="grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
          <ModeCard
            id="create"
            title="Create Online Room"
            hindi="नया रण"
            blurb="Host a room. Share an invite code with allies."
            icon="🏯"
            color="#FF9933"
            active={active === "create"}
            onActivate={() => setActive(active === "create" ? null : "create")}
          >
            <CreateRoomForm />
          </ModeCard>

          <ModeCard
            id="local"
            title="Local Pass-and-Play"
            hindi="स्थानीय युद्ध"
            blurb="Pass one device around the table."
            icon="🪔"
            color="#D4A017"
            active={active === "local"}
            onActivate={() => setActive(active === "local" ? null : "local")}
          >
            <LocalSetup />
          </ModeCard>

          <ModeCard
            id="join"
            title="Join Online Room"
            hindi="रण में पधारो"
            blurb="Enter a code from a friend's invite."
            icon="⚔"
            color="#138808"
            active={active === "join"}
            onActivate={() => setActive(active === "join" ? null : "join")}
          >
            <JoinRoomForm prefillCode={search.join} />
          </ModeCard>
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

function ModeCard({
  id, title, hindi, blurb, icon, color, active, onActivate, children,
}: {
  id: CardId; title: string; hindi: string; blurb: string; icon: string; color: string;
  active: boolean; onActivate: () => void; children: React.ReactNode;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-3xl p-[2px]"
      style={{ background: `linear-gradient(135deg, ${color} 0%, #FFFFFF 50%, ${color} 100%)` }}
    >
      <div className="relative overflow-hidden rounded-[1.4rem] bg-[oklch(0.14_0.05_285_/_0.92)] p-6 backdrop-blur-md">
        {["left-3 top-3", "right-3 top-3", "left-3 bottom-3", "right-3 bottom-3"].map((p) => (
          <span key={p} className={`absolute ${p} h-2 w-2 rounded-full bg-[var(--gold)] shadow-[0_0_8px_var(--gold)]`} />
        ))}
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
          style={{
            background: "linear-gradient(180deg, oklch(0.22 0.08 285), oklch(0.16 0.06 285))",
            border: "1px solid oklch(0.74 0.13 80 / 0.5)",
            color, filter: `drop-shadow(0 0 8px ${color})`,
          }}
        >
          {icon}
        </div>
        <p className="font-body text-[10px] uppercase tracking-[0.4em] text-[var(--gold-soft)]/70">{hindi}</p>
        <h2 className="text-gold-glow mt-1 font-display text-xl">{title}</h2>
        <p className="mt-2 mb-4 font-serif italic text-sm text-[var(--foreground)]/80">{blurb}</p>

        {!active ? (
          <button
            onClick={onActivate}
            className="w-full rounded-full border border-[var(--gold)]/40 px-4 py-2 font-body text-xs uppercase tracking-[0.35em] text-[var(--gold)] hover:bg-[var(--gold)]/10"
          >
            {id === "local" ? "Setup →" : "Open →"}
          </button>
        ) : (
          <div className="border-t border-[var(--gold)]/20 pt-4">{children}</div>
        )}
      </div>
    </motion.div>
  );
}

function LocalSetup() {
  const navigate = useNavigate();
  const setMode = useGameStore((s) => s.setMode);
  const setPlayerCount = useGameStore((s) => s.setPlayerCount);
  const initPregame = usePregameStore((s) => s.init);
  const [count, setCount] = useState(2);

  function start() {
    setMode("local");
    setPlayerCount(count);
    initPregame(count);
    navigate({ to: "/avatar-select" });
  }

  return (
    <div>
      <p className="mb-3 font-body text-[10px] uppercase tracking-[0.3em] text-[var(--gold-soft)]/70">Warriors</p>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setCount(n)}
            className={`rounded-xl border px-3 py-2 font-display text-lg transition ${
              count === n ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold)]"
                          : "border-[var(--gold)]/25 text-[var(--gold-soft)]/70 hover:border-[var(--gold)]/60"
            }`}
          >{n}</button>
        ))}
      </div>
      <button onClick={start}
        className="w-full rounded-full px-4 py-3 font-display text-sm tracking-widest text-[oklch(0.13_0.04_285)]"
        style={{ background: "linear-gradient(180deg, #FFE9A8 0%, #D4A017 60%, #8a6510 100%)" }}
      >PROCEED →</button>
    </div>
  );
}

function CreateRoomForm() {
  const navigate = useNavigate();
  const setMode = useGameStore((s) => s.setMode);
  const setRoomCode = useGameStore((s) => s.setRoomCode);
  const setIsHost = useGameStore((s) => s.setIsHost);
  const [name, setName] = useState("");
  const [count, setCount] = useState(2);
  const [domain, setDomain] = useState<"mixed"|"banking"|"insurance"|"general">("mixed");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!name.trim()) { toast.error("Enter your name"); return; }
    setBusy(true);
    try {
      const userId = await ensureAnonSession();
      const { code } = await createRoom({
        hostId: userId, maxPlayers: count, questionDomain: domain, displayName: name.trim(),
      });
      setMode("online"); setRoomCode(code); setIsHost(true);
      navigate({ to: "/lobby/$code", params: { code } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your warrior name"
        className="w-full rounded-lg border border-[var(--gold)]/30 bg-[oklch(0.18_0.05_285)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--gold-soft)]/40 focus:border-[var(--gold)] focus:outline-none"
      />
      <div>
        <p className="mb-1 font-body text-[10px] uppercase tracking-[0.3em] text-[var(--gold-soft)]/70">Max players</p>
        <div className="grid grid-cols-4 gap-2">
          {[2,3,4,5].map((n) => (
            <button key={n} onClick={() => setCount(n)}
              className={`rounded-lg border px-2 py-1.5 font-display text-base ${
                count === n ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold)]"
                            : "border-[var(--gold)]/25 text-[var(--gold-soft)]/70"
              }`}
            >{n}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 font-body text-[10px] uppercase tracking-[0.3em] text-[var(--gold-soft)]/70">Question Domain</p>
        <select value={domain} onChange={(e) => setDomain(e.target.value as typeof domain)}
          className="w-full rounded-lg border border-[var(--gold)]/30 bg-[oklch(0.18_0.05_285)] px-3 py-2 text-sm text-[var(--foreground)]"
        >
          <option value="mixed">Mixed</option>
          <option value="general">General</option>
          <option value="banking">Banking</option>
          <option value="insurance">Insurance</option>
        </select>
      </div>
      <button disabled={busy} onClick={handleCreate}
        className="w-full rounded-full px-4 py-3 font-display text-sm tracking-widest text-[oklch(0.13_0.04_285)] disabled:opacity-50"
        style={{ background: "linear-gradient(180deg, #FFE9A8 0%, #D4A017 60%, #8a6510 100%)" }}
      >{busy ? "Forging…" : "CREATE ROOM →"}</button>
    </div>
  );
}

function JoinRoomForm({ prefillCode }: { prefillCode?: string }) {
  const navigate = useNavigate();
  const setMode = useGameStore((s) => s.setMode);
  const setRoomCode = useGameStore((s) => s.setRoomCode);
  const setIsHost = useGameStore((s) => s.setIsHost);
  const [code, setCode] = useState(prefillCode?.toUpperCase() ?? "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleJoin() {
    if (!name.trim()) { toast.error("Enter your name"); return; }
    if (code.length !== 6) { toast.error("Code must be 6 characters"); return; }
    setBusy(true);
    try {
      const userId = await ensureAnonSession();
      const room = await fetchRoomByCode(code);
      if (!room) { toast.error("Room not found"); return; }
      await joinRoom({ code, userId, displayName: name.trim() });
      setMode("online"); setRoomCode(code); setIsHost(false);
      navigate({ to: "/lobby/$code", params: { code: code.toUpperCase() } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your warrior name"
        className="w-full rounded-lg border border-[var(--gold)]/30 bg-[oklch(0.18_0.05_285)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--gold-soft)]/40 focus:border-[var(--gold)] focus:outline-none"
      />
      <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
        placeholder="ROOM CODE" maxLength={6}
        className="w-full rounded-lg border border-[var(--gold)]/30 bg-[oklch(0.18_0.05_285)] px-3 py-2 text-center font-display text-2xl tracking-[0.4em] text-[var(--gold)] placeholder:text-[var(--gold-soft)]/30 focus:border-[var(--gold)] focus:outline-none"
      />
      <button disabled={busy} onClick={handleJoin}
        className="w-full rounded-full px-4 py-3 font-display text-sm tracking-widest text-[oklch(0.13_0.04_285)] disabled:opacity-50"
        style={{ background: "linear-gradient(180deg, #FFE9A8 0%, #D4A017 60%, #8a6510 100%)" }}
      >{busy ? "Entering…" : "JOIN GAME →"}</button>
    </div>
  );
}
