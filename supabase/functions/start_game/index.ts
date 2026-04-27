import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { adminClient, getUserFromRequest } from "../_shared/auth.ts";
import { TILES } from "../_shared/game.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userId = await getUserFromRequest(req);
    if (!userId) return errorResponse("Unauthorized", 401);

    const { room_id } = await req.json();
    if (!room_id) return errorResponse("room_id required");

    const admin = adminClient();
    const { data: room } = await admin.from("rooms").select("*").eq("id", room_id).maybeSingle();
    if (!room) return errorResponse("Room not found", 404);
    if (room.host_id !== userId) return errorResponse("Only host can start", 403);
    if (room.status !== "lobby") return errorResponse("Already started");

    const { data: roster } = await admin.from("players")
      .select("id, ready").eq("room_id", room_id);
    if (!roster || roster.length < 2) return errorResponse("Need at least 2 players");
    if (!roster.every((p) => p.ready)) return errorResponse("All players must be ready");

    // Initialize tile state rows
    const rows = TILES.map((t) => ({ room_id, tile_index: t.index, owner_id: null, layers: 0 }));
    await admin.from("tiles_state").upsert(rows, { onConflict: "room_id,tile_index" });

    await admin.from("rooms").update({
      status: "playing",
      current_player_index: 0,
      round: 1,
    }).eq("id", room_id);

    await admin.from("game_events").insert({
      room_id, player_id: null, event_type: "game_start",
      payload: { player_count: roster.length },
    });

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error("start_game error", e);
    return errorResponse((e as Error).message, 400);
  }
});
