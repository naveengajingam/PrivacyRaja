import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SceneShell } from "@/components/SceneShell";
import { MughalFrame } from "@/components/MughalFrame";
import { supabase } from "@/integrations/supabase/client";
import { ensureAnonSession, callFunction } from "@/lib/online";
import { AVATARS, type ElementId } from "@/game/avatars";
import { useGameStore } from "@/store/useGameStore";
import { toast } from "sonner";

export const Route = createFileRoute("/lobby/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Lobby ${params.code} — Privacy Raja` },
      { name: "description", content: "Wait for warriors to assemble before battle." },
    ],
  }),
  component: Page,
});

interface PlayerRow {
  id: string;
  user_id: string;
  display_name: string;
  avatar: ElementId | null;
  ready: boolean;
  seat_index: number;
}
interface RoomRow {
  id: string; code: string; host_id: string; status: string; max_players: number;
}

function Page() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [me, setMe] = useState<{ userId: string; playerId: string } | null>(null);
  const [pickedAvatar, setPickedAvatar] = useState<ElementId | null>(null);
  const setMode = useGameStore((s) => s.setMode);
  const setRoomCode = useGameStore((s) => s.setRoomCode);
  const setIsHost = useGameStore((s) => s.setIsHost);

  // Load room + my player
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = await ensureAnonSession();
      const { data: r } = await supabase.from("rooms").select("*").eq("code", code).maybeSingle();
      if (!r) { toast.error("Room not found"); navigate({ to: "/multiplayer-setup" }); return; }
      const { data: ps } = await supabase.from("players").select("*").eq("room_id", r.id).order("seat_index");
      if (cancelled) return;
      setRoom(r as RoomRow);
      setPlayers((ps ?? []) as PlayerRow[]);
      const mine = (ps ?? []).find((p) => p.user_id === userId) as PlayerRow | undefined;
      if (mine) {
        setMe({ userId, playerId: mine.id });
        setPickedAvatar(mine.avatar);
      } else {
        // Not yet a member — bounce to join form
        navigate({ to: "/multiplayer-setup", search: { join: code } });
        return;
      }
      setMode("online"); setRoomCode(code); setIsHost(r.host_id === userId);
    })();
    return () => { cancelled = true; };
  }, [code, navigate, setMode, setRoomCode, setIsHost]);

  // Realtime subscriptions
  useEffect(() => {
    if (!room) return;
    const ch = supabase
      .channel(`room:${room.code}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${room.id}` },
        async () => {
          const { data } = await supabase.from("players").select("*").eq("room_id", room.id).order("seat_index");
          setPlayers((data ?? []) as PlayerRow[]);
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          const r = payload.new as RoomRow;
          setRoom(r);
          if (r.status === "playing") navigate({ to: "/game" });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [room, navigate]);

  async function chooseAvatar(av: ElementId) {
    if (!me) return;
    const taken = players.find((p) => p.avatar === av && p.user_id !== me.userId);
    if (taken) { toast.error("Already taken"); return; }
    const { error } = await supabase.from("players").update({ avatar: av }).eq("id", me.playerId);
    if (error) toast.error(error.message);
    else setPickedAvatar(av);
  }

  async function toggleReady() {
    if (!me) return;
    const mine = players.find((p) => p.id === me.playerId);
    if (!mine?.avatar) { toast.error("Pick an avatar first"); return; }
    await supabase.from("players").update({ ready: !mine.ready }).eq("id", me.playerId);
  }

  async function startBattle() {
    if (!room) return;
    try {
      await callFunction("start_game", { room_id: room.id });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : "";
  const isHost = !!(me && room && room.host_id === me.userId);
  const myRow = players.find((p) => p.id === me?.playerId);
  const allReady = players.length >= 2 && players.every((p) => p.ready && p.avatar);

  function copyInvite() {
    navigator.clipboard.writeText(inviteUrl).then(() => toast.success("Invite link copied"));
  }
  function shareInvite() {
    if (navigator.share) navigator.share({ title: "Privacy Raja", text: `Join my game! Code: ${code}`, url: inviteUrl }).catch(() => {});
    else copyInvite();
  }

  return (
    <SceneShell>
      <main className="flex min-h-screen flex-col items-center px-4 py-10">
        <div className="w-full max-w-3xl">
          <MughalFrame>
            <p className="text-center font-body text-[10px] uppercase tracking-[0.4em] text-[var(--gold-soft)]/70">
              Pre-Game Lobby
            </p>
            <h1 className="text-gold-glow mt-1 text-center font-display text-3xl md:text-4xl">
              Room <span className="tracking-[0.3em]">{code}</span>
            </h1>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button onClick={copyInvite}
                className="rounded-full border border-[var(--gold)]/40 px-4 py-1.5 font-body text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] hover:bg-[var(--gold)]/10"
              >Copy Link</button>
              <button onClick={shareInvite}
                className="rounded-full border border-[var(--gold)]/40 px-4 py-1.5 font-body text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] hover:bg-[var(--gold)]/10"
              >Share</button>
            </div>
            <p className="mt-2 text-center text-xs text-[var(--gold-soft)]/60 break-all">{inviteUrl}</p>

            <div className="mt-6 text-center font-serif italic text-sm text-[var(--foreground)]/75">
              {players.length} of {room?.max_players ?? "?"} warriors joined
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              <AnimatePresence>
                {players.map((p) => {
                  const av = AVATARS.find((a) => a.id === p.avatar);
                  return (
                    <motion.div key={p.id} layout
                      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="rounded-xl border border-[var(--gold)]/30 bg-[oklch(0.18_0.05_285)] p-3 text-center"
                    >
                      <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-xl text-xl"
                        style={{
                          background: av ? av.color : "oklch(0.22 0.06 285)",
                          boxShadow: av ? `0 0 14px ${av.glow}` : undefined,
                        }}
                      >{av?.symbol ?? "?"}</div>
                      <div className="font-display text-sm text-gold-glow truncate">{p.display_name}</div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold-soft)]/70">{av?.name ?? "—"}</div>
                      <div className={`mt-1 text-[10px] uppercase tracking-[0.3em] ${p.ready ? "text-[var(--india-green)]" : "text-[var(--gold-soft)]/50"}`}>
                        {p.ready ? "Ready" : "Waiting"}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Avatar picker */}
            {me && (
              <div className="mt-6">
                <p className="mb-2 text-center font-body text-[10px] uppercase tracking-[0.3em] text-[var(--gold-soft)]/70">
                  {pickedAvatar ? "Change your element" : "Pick your element"}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {AVATARS.map((a) => {
                    const takenBy = players.find((p) => p.avatar === a.id);
                    const mine = takenBy?.user_id === me.userId;
                    const disabled = !!takenBy && !mine;
                    return (
                      <button key={a.id} onClick={() => chooseAvatar(a.id)} disabled={disabled}
                        className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl transition ${
                          mine ? "ring-2 ring-[var(--gold)]" : ""
                        } ${disabled ? "opacity-30" : "hover:scale-110"}`}
                        style={{ background: a.color, boxShadow: `0 0 12px ${a.glow}` }}
                        title={a.name}
                      >{a.symbol}</button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button onClick={toggleReady} disabled={!myRow?.avatar}
                className="rounded-full border border-[var(--gold)]/40 px-5 py-2 font-display text-sm text-[var(--gold)] disabled:opacity-40 hover:bg-[var(--gold)]/10"
              >{myRow?.ready ? "Cancel Ready" : "I'm Ready"}</button>

              {isHost && (
                <button onClick={startBattle} disabled={!allReady}
                  className="rounded-full px-6 py-2 font-display text-sm tracking-widest text-[oklch(0.13_0.04_285)] disabled:opacity-40"
                  style={{ background: "linear-gradient(180deg, #FFE9A8 0%, #D4A017 60%, #8a6510 100%)" }}
                >⚔ START BATTLE</button>
              )}
              {!isHost && allReady && (
                <span className="font-serif italic text-sm text-[var(--gold-soft)]/70">Waiting for host to start…</span>
              )}
            </div>

            <div className="mt-8 text-center">
              <Link to="/multiplayer-setup" className="text-xs uppercase tracking-[0.4em] text-[var(--gold-soft)]/60 hover:text-[var(--gold)]">← Leave Lobby</Link>
            </div>
          </MughalFrame>
        </div>
      </main>
    </SceneShell>
  );
}
