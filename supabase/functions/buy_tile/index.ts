import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { adminClient, getUserFromRequest, requirePlayerTurn } from "../_shared/auth.ts";
import { TILES } from "../_shared/game.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userId = await getUserFromRequest(req);
    if (!userId) return errorResponse("Unauthorized", 401);

    const { room_id, player_id, tile_index } = await req.json();
    if (!room_id || !player_id || tile_index == null) return errorResponse("Missing fields");

    const admin = adminClient();
    const { player } = await requirePlayerTurn(admin, userId, room_id, player_id, {
      mustBeCurrentTurn: true,
    });

    const tile = TILES[tile_index];
    if (!tile || tile.type !== "principle" || !tile.basePrice) {
      return errorResponse("Tile not purchasable");
    }

    const { data: ts } = await admin.from("tiles_state")
      .select("*").eq("room_id", room_id).eq("tile_index", tile_index).maybeSingle();

    if (ts?.owner_id) return errorResponse("Tile already owned");
    if (player.cash < tile.basePrice) return errorResponse("Insufficient cash");

    if (ts) {
      await admin.from("tiles_state")
        .update({ owner_id: player_id, layers: 0 }).eq("id", ts.id);
    } else {
      await admin.from("tiles_state").insert({
        room_id, tile_index, owner_id: player_id, layers: 0,
      });
    }
    await admin.from("players").update({ cash: player.cash - tile.basePrice }).eq("id", player_id);

    await admin.from("game_events").insert({
      room_id, player_id, event_type: "buy",
      payload: { tile_index, price: tile.basePrice },
    });

    return jsonResponse({ ok: true, price: tile.basePrice });
  } catch (e) {
    console.error("buy_tile error", e);
    return errorResponse((e as Error).message, 400);
  }
});
