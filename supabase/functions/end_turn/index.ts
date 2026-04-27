import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { adminClient, getUserFromRequest, requirePlayerTurn } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userId = await getUserFromRequest(req);
    if (!userId) return errorResponse("Unauthorized", 401);

    const { room_id, player_id } = await req.json();
    if (!room_id || !player_id) return errorResponse("Missing fields");

    const admin = adminClient();
    const { room } = await requirePlayerTurn(admin, userId, room_id, player_id, {
      mustBeCurrentTurn: true,
    });

    const { data: roster } = await admin.from("players")
      .select("id, seat_index, is_bankrupt")
      .eq("room_id", room_id)
      .order("seat_index", { ascending: true });

    if (!roster || roster.length === 0) return errorResponse("No players");

    const active = roster.filter((p) => !p.is_bankrupt);
    if (active.length <= 1) {
      // Game over
      const winner = active[0] ?? null;
      await admin.from("rooms").update({ status: "finished" }).eq("id", room_id);
      await admin.from("game_events").insert({
        room_id, player_id: null, event_type: "gameover",
        payload: { winner_id: winner?.id ?? null },
      });
      return jsonResponse({ gameover: true, winner_id: winner?.id ?? null });
    }

    let nextIdx = (room.current_player_index + 1) % roster.length;
    for (let i = 0; i < roster.length; i++) {
      if (!roster[nextIdx].is_bankrupt) break;
      nextIdx = (nextIdx + 1) % roster.length;
    }

    const newRound = nextIdx <= room.current_player_index ? room.round + 1 : room.round;
    await admin.from("rooms").update({
      current_player_index: nextIdx,
      round: newRound,
    }).eq("id", room_id);

    await admin.from("game_events").insert({
      room_id, player_id: null, event_type: "turn_end",
      payload: {
        previous_player_id: player_id,
        next_player_id: roster[nextIdx].id,
        next_seat_index: nextIdx,
        round: newRound,
      },
    });

    return jsonResponse({
      next_player_id: roster[nextIdx].id, next_seat_index: nextIdx, round: newRound,
    });
  } catch (e) {
    console.error("end_turn error", e);
    return errorResponse((e as Error).message, 400);
  }
});
