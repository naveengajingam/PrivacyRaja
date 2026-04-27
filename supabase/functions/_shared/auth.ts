import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function getUserFromRequest(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, "");
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data } = await sb.auth.getUser();
  return data?.user?.id ?? null;
}

/**
 * Validate that the calling user controls the given player in the given room.
 * Returns the player row + room row if valid, throws Response otherwise.
 */
export async function requirePlayerTurn(
  admin: SupabaseClient,
  userId: string,
  roomId: string,
  playerId: string,
  opts: { mustBeCurrentTurn?: boolean } = {},
): Promise<{ player: any; room: any }> {
  const { data: room, error: roomErr } = await admin
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();
  if (roomErr || !room) throw new Error("Room not found");

  const { data: player, error: pErr } = await admin
    .from("players")
    .select("*")
    .eq("id", playerId)
    .eq("room_id", roomId)
    .maybeSingle();
  if (pErr || !player) throw new Error("Player not found");
  if (player.user_id !== userId) throw new Error("Not your player");

  if (opts.mustBeCurrentTurn) {
    const { data: roster } = await admin
      .from("players")
      .select("id, seat_index")
      .eq("room_id", roomId)
      .order("seat_index", { ascending: true });
    const current = roster?.[room.current_player_index];
    if (!current || current.id !== playerId) {
      throw new Error("Not your turn");
    }
  }

  return { player, room };
}
