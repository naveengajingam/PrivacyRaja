import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { adminClient, getUserFromRequest, requirePlayerTurn } from "../_shared/auth.ts";
import { TILES, tilesInGroup } from "../_shared/game.ts";

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
    if (!tile || tile.type !== "principle" || !tile.colorGroup || !tile.basePrice) {
      return errorResponse("Cannot build here");
    }

    const groupIdxs = tilesInGroup(tile.colorGroup);
    const { data: grp } = await admin.from("tiles_state")
      .select("tile_index, owner_id, layers")
      .eq("room_id", room_id).in("tile_index", groupIdxs);

    const ownsAll = grp?.length === groupIdxs.length && grp.every((g) => g.owner_id === player_id);
    if (!ownsAll) return errorResponse("Must own full color group");

    const ts = grp!.find((g) => g.tile_index === tile_index)!;
    if (ts.layers >= 4) return errorResponse("Max layers reached");

    const cost = Math.round(tile.basePrice * 0.6);
    if (player.cash < cost) return errorResponse("Insufficient cash");

    await admin.from("tiles_state").update({ layers: ts.layers + 1 })
      .eq("room_id", room_id).eq("tile_index", tile_index);
    await admin.from("players").update({ cash: player.cash - cost }).eq("id", player_id);

    await admin.from("game_events").insert({
      room_id, player_id, event_type: "build",
      payload: { tile_index, newLayers: ts.layers + 1, cost },
    });

    return jsonResponse({ ok: true, layers: ts.layers + 1, cost });
  } catch (e) {
    console.error("build_layer error", e);
    return errorResponse((e as Error).message, 400);
  }
});
