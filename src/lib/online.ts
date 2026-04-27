import { supabase } from "@/integrations/supabase/client";

export async function ensureAnonSession(): Promise<string> {
  const { data: sess } = await supabase.auth.getSession();
  if (sess.session) return sess.session.user.id;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) throw error ?? new Error("Anon sign-in failed");
  return data.user.id;
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function createRoom(opts: {
  hostId: string;
  maxPlayers: number;
  questionDomain: "mixed" | "banking" | "insurance" | "general";
  displayName: string;
}): Promise<{ roomId: string; code: string; playerId: string }> {
  // Try a few codes in case of collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const { data: room, error } = await supabase
      .from("rooms")
      .insert({
        code,
        host_id: opts.hostId,
        max_players: opts.maxPlayers,
        question_domain: opts.questionDomain,
        status: "lobby",
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") continue; // unique violation, retry
      throw error;
    }
    const { data: player, error: pErr } = await supabase
      .from("players")
      .insert({
        room_id: room.id,
        user_id: opts.hostId,
        display_name: opts.displayName,
        seat_index: 0,
      })
      .select()
      .single();
    if (pErr) throw pErr;
    return { roomId: room.id, code: room.code, playerId: player.id };
  }
  throw new Error("Could not allocate room code");
}

export async function fetchRoomByCode(code: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function joinRoom(opts: {
  code: string;
  userId: string;
  displayName: string;
}) {
  const room = await fetchRoomByCode(opts.code);
  if (!room) throw new Error("Room not found");
  if (room.status !== "lobby") throw new Error("Game already started");

  // Check if already joined
  const { data: existing } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", room.id)
    .eq("user_id", opts.userId)
    .maybeSingle();
  if (existing) return { roomId: room.id, code: room.code, playerId: existing.id };

  const { count } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("room_id", room.id);
  if ((count ?? 0) >= room.max_players) throw new Error("Room is full");

  const { data: player, error } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      user_id: opts.userId,
      display_name: opts.displayName,
      seat_index: count ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return { roomId: room.id, code: room.code, playerId: player.id };
}

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export async function callFunction<T = unknown>(name: string, body: unknown): Promise<T> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Function error");
  }
  return res.json();
}
