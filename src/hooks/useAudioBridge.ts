import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";
import { audio } from "@/lib/audio";

/**
 * Subscribes to relevant game-store transitions and fires the appropriate
 * sound effects. Attach once at the root of the game screen.
 */
export function useAudioBridge() {
  const prevPhase = useRef<string | null>(null);
  const prevRolling = useRef(false);
  const prevMcqsCorrect = useRef<Record<string, number>>({});
  const prevMcqsTotal = useRef<Record<string, number>>({});
  const prevLayers = useRef<Record<number, number>>({});
  const prevInJail = useRef<Record<string, boolean>>({});

  // Ambient loop lifecycle — starts when the screen mounts.
  useEffect(() => {
    const musicMuted = !useGameStore.getState().musicEnabled;
    audio.setMusicMuted(musicMuted);
    audio.setSfxMuted(!useGameStore.getState().soundEnabled);
    audio.startAmbient();
    return () => {
      audio.fadeOutAmbient(600);
    };
  }, []);

  // React to store changes
  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prev) => {
      // mute toggles
      if (state.soundEnabled !== prev.soundEnabled) audio.setSfxMuted(!state.soundEnabled);
      if (state.musicEnabled !== prev.musicEnabled) audio.setMusicMuted(!state.musicEnabled);

      // phase transitions
      const phase = state.phase;
      if (phase !== prevPhase.current) {
        const from = prevPhase.current;
        prevPhase.current = phase;
        // dice thud when settling out of "rolling" into "moving"
        if (from === "rolling" && phase === "moving") {
          audio.play("diceThud", { volume: 0.75 });
          setTimeout(() => audio.play("ting", { volume: 0.5 }), 140);
        }
        if (phase === "card") audio.play("cardFlip", { volume: 0.7 });
        if (phase === "mcq") audio.play("ting", { volume: 0.35 });
        if (phase === "gameover") {
          audio.fadeOutAmbient(400);
          audio.play("victory", { volume: 0.8 });
          setTimeout(() => audio.play("crowdCheer", { volume: 0.55 }), 600);
        }
      }

      // dice rumble while rolling
      if (state.dice.isRolling && !prevRolling.current) {
        audio.play("diceRumble", { volume: 0.6 });
      }
      prevRolling.current = state.dice.isRolling;

      // MCQ correct/wrong (detected by mcqsCorrect/total deltas per player)
      for (const p of state.players) {
        const c = prevMcqsCorrect.current[p.id] ?? p.mcqsCorrect;
        const t = prevMcqsTotal.current[p.id] ?? p.mcqsTotal;
        if (p.mcqsTotal > t) {
          if (p.mcqsCorrect > c) audio.play("mcqCorrect", { volume: 0.75 });
          else audio.play("mcqWrong", { volume: 0.7 });
        }
        prevMcqsCorrect.current[p.id] = p.mcqsCorrect;
        prevMcqsTotal.current[p.id] = p.mcqsTotal;

        // jail clank on entering jail
        const wasJail = prevInJail.current[p.id] ?? false;
        if (p.inJail && !wasJail) audio.play("jailClank", { volume: 0.8 });
        prevInJail.current[p.id] = p.inJail;
      }

      // layer build: tileState.layers going up for any tile
      for (const ts of state.tileStates) {
        const prevL = prevLayers.current[ts.tileIndex] ?? ts.layers;
        if (ts.layers > prevL) {
          audio.play("layerBuild", { volume: 0.75 });
        }
        prevLayers.current[ts.tileIndex] = ts.layers;
      }
    });
    return unsub;
  }, []);
}

/**
 * Fires a short footstep sound for the active player's element every time
 * their displayed tile index changes (i.e. one hop = one step).
 */
export function useFootstepAudio(
  playerIdToElement: Record<string, string | null | undefined>,
  displayedPositions: Record<string, number>,
) {
  const prevRef = useRef<Record<string, number>>({});
  useEffect(() => {
    for (const id of Object.keys(displayedPositions)) {
      const cur = displayedPositions[id];
      const prev = prevRef.current[id];
      if (prev != null && prev !== cur) {
        const el = playerIdToElement[id];
        if (el) audio.playStep(el as any);
      }
      prevRef.current[id] = cur;
    }
  }, [displayedPositions, playerIdToElement]);
}
