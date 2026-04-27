import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { adminClient, getUserFromRequest, requirePlayerTurn } from "../_shared/auth.ts";
import { TILES, BOARD_SIZE } from "../_shared/game.ts";

const GO_REWARD = 200;
const JAIL_TILE = 7;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userId = await getUserFromRequest(req);
    if (!userId) return errorResponse("Unauthorized", 401);

    const { room_id, player_id } = await req.json();
    if (!room_id || !player_id) return errorResponse("room_id and player_id required");

    const admin = adminClient();
    const { player, room } = await requirePlayerTurn(admin, userId, room_id, player_id, {
      mustBeCurrentTurn: true,
    });

    if (room.status !== "playing") return errorResponse("Game not in progress");

    const value = 1 + Math.floor(Math.random() * 6);

    // Jail handling
    if (player.in_jail) {
      if (value === 6) {
        await admin.from("players").update({ in_jail: false, jail_turns: 0 }).eq("id", player_id);
        await admin.from("game_events").insert({
          room_id, player_id, event_type: "roll",
          payload: { value, escapedJail: true },
        });
        return jsonResponse({ value, escapedJail: true });
      }
      const jt = player.jail_turns + 1;
      if (jt >= 3) {
        await admin.from("players").update({
          in_jail: false, jail_turns: 0, cash: Math.max(0, player.cash - 100),
        }).eq("id", player_id);
        await admin.from("game_events").insert({
          room_id, player_id, event_type: "roll",
          payload: { value, forcedReleaseFine: 100 },
        });
        return jsonResponse({ value, forcedRelease: true });
      }
      await admin.from("players").update({ jail_turns: jt }).eq("id", player_id);
      await admin.from("game_events").insert({
        room_id, player_id, event_type: "roll",
        payload: { value, stillInJail: true, jailTurns: jt },
      });
      return jsonResponse({ value, stillInJail: true });
    }

    // Move the player
    const startPos = player.position;
    const newPos = (startPos + value) % BOARD_SIZE;
    let cashGain = 0;
    if (startPos + value >= BOARD_SIZE) cashGain = GO_REWARD;

    let updates: Record<string, unknown> = {
      position: newPos,
      cash: player.cash + cashGain,
    };

    // If landed on go_to_jail, send to jail
    const landed = TILES[newPos];
    if (landed.type === "go_to_jail") {
      updates = { ...updates, position: JAIL_TILE, in_jail: true, jail_turns: 0 };
    }

    await admin.from("players").update(updates).eq("id", player_id);

    await admin.from("game_events").insert({
      room_id, player_id, event_type: "roll",
      payload: {
        value, startPos, newPos: (updates as any).position,
        cashGain, landedTileIndex: (updates as any).position,
        sentToJail: landed.type === "go_to_jail",
      },
    });

    return jsonResponse({
      value, startPos, newPos: (updates as any).position,
      cashGain, sentToJail: landed.type === "go_to_jail",
    });
  } catch (e) {
    console.error("roll_dice error", e);
    return errorResponse((e as Error).message, 400);
  }
});
