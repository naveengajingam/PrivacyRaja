import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { adminClient, getUserFromRequest, requirePlayerTurn } from "../_shared/auth.ts";
import { TILES, LAYER_MULTIPLIER, tilesInGroup } from "../_shared/game.ts";

const UTILITY_RENT = 75;

function rentFor(tile: any, layers: number, fullGroup: boolean): number {
  if (tile.type === "utility") return UTILITY_RENT;
  if (tile.type !== "principle" || !tile.baseRent) return 0;
  const groupBonus = fullGroup && layers === 0 ? 2 : 1;
  return tile.baseRent * LAYER_MULTIPLIER[Math.min(layers, 4)] * groupBonus;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userId = await getUserFromRequest(req);
    if (!userId) return errorResponse("Unauthorized", 401);

    const { room_id, player_id, tile_index, question_id, answer_index, reason } =
      await req.json();
    if (!room_id || !player_id || tile_index == null || !question_id || answer_index == null) {
      return errorResponse("Missing fields");
    }

    const admin = adminClient();
    const { player } = await requirePlayerTurn(admin, userId, room_id, player_id, {
      mustBeCurrentTurn: true,
    });

    const { data: q } = await admin.from("mcq_bank").select("*").eq("id", question_id).maybeSingle();
    if (!q) return errorResponse("Unknown question");

    const correct = answer_index === q.correct_index;
    const tile = TILES[tile_index];

    // Update mcq stats
    await admin.from("players").update({
      mcqs_correct: player.mcqs_correct + (correct ? 1 : 0),
      mcqs_total: player.mcqs_total + 1,
    }).eq("id", player_id);

    let resolution: any = { correct, correctIndex: q.correct_index };

    if (reason === "rent" && !correct) {
      // pay rent to owner
      const { data: ts } = await admin.from("tiles_state")
        .select("*").eq("room_id", room_id).eq("tile_index", tile_index).maybeSingle();
      if (ts?.owner_id && ts.owner_id !== player_id) {
        const { data: owner } = await admin.from("players").select("*").eq("id", ts.owner_id).maybeSingle();
        if (owner) {
          // determine if owner has full group
          let fullGroup = false;
          if (tile.colorGroup) {
            const groupIdxs = tilesInGroup(tile.colorGroup);
            const { data: grp } = await admin.from("tiles_state")
              .select("tile_index,owner_id").eq("room_id", room_id).in("tile_index", groupIdxs);
            fullGroup = grp?.length === groupIdxs.length && grp.every((g) => g.owner_id === ts.owner_id);
          }
          const rent = rentFor(tile, ts.layers, fullGroup);
          const pay = Math.min(player.cash, rent);
          await admin.from("players").update({ cash: player.cash - pay }).eq("id", player_id);
          await admin.from("players").update({ cash: owner.cash + pay }).eq("id", owner.id);
          resolution = { ...resolution, rentPaid: pay, paidTo: owner.id, fullGroup };

          // Bankruptcy?
          if (player.cash - pay <= 0 && rent > player.cash) {
            await admin.from("players").update({ is_bankrupt: true }).eq("id", player_id);
            await admin.from("tiles_state")
              .update({ owner_id: null, layers: 0 })
              .eq("room_id", room_id).eq("owner_id", player_id);
            resolution.bankrupt = true;
          }
        }
      }
    }

    await admin.from("game_events").insert({
      room_id, player_id, event_type: "mcq",
      payload: { tile_index, question_id, answer_index, reason, ...resolution },
    });

    return jsonResponse(resolution);
  } catch (e) {
    console.error("submit_mcq error", e);
    return errorResponse((e as Error).message, 400);
  }
});
