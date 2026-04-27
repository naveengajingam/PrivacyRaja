// Audio manager using Howler.js. Centralises all SFX so every call site uses
// the same volume settings, mute toggle, and reduced-motion behaviour.
//
// Sounds are procedurally-generated WAVs bundled under /public/audio/ (see
// scripts/gen_audio.py). They are tiny, royalty-free, and loaded lazily.

import { Howl, Howler } from "howler";
import type { ElementId } from "@/game/avatars";

type SfxId =
  | "diceRumble"
  | "diceThud"
  | "ting"
  | "stepEarth"
  | "stepWater"
  | "stepFire"
  | "stepAir"
  | "stepEther"
  | "mcqCorrect"
  | "mcqWrong"
  | "layerBuild"
  | "cardFlip"
  | "jailClank"
  | "victory"
  | "crowdCheer";

const FILES: Record<SfxId, string> = {
  diceRumble: "/audio/dice-rumble.wav",
  diceThud: "/audio/dice-thud.wav",
  ting: "/audio/ting.wav",
  stepEarth: "/audio/step-earth.wav",
  stepWater: "/audio/step-water.wav",
  stepFire: "/audio/step-fire.wav",
  stepAir: "/audio/step-air.wav",
  stepEther: "/audio/step-ether.wav",
  mcqCorrect: "/audio/mcq-correct.wav",
  mcqWrong: "/audio/mcq-wrong.wav",
  layerBuild: "/audio/layer-build.wav",
  cardFlip: "/audio/card-flip.wav",
  jailClank: "/audio/jail-clank.wav",
  victory: "/audio/victory.wav",
  crowdCheer: "/audio/crowd-cheer.wav",
};

const cache: Partial<Record<SfxId, Howl>> = {};
let ambient: Howl | null = null;
let sfxMuted = false;
let musicMuted = false;

function getSfx(id: SfxId): Howl {
  if (!cache[id]) {
    cache[id] = new Howl({ src: [FILES[id]], volume: 0.7, preload: true });
  }
  return cache[id]!;
}

function ensureUnlocked() {
  // Howler unlocks automatically on first user gesture, but surface a helper
  // for consumers who want to warm it up.
  if (Howler.ctx && Howler.ctx.state === "suspended") {
    Howler.ctx.resume().catch(() => {});
  }
}

export const audio = {
  isSfxMuted: () => sfxMuted,
  isMusicMuted: () => musicMuted,
  setSfxMuted(m: boolean) {
    sfxMuted = m;
    for (const h of Object.values(cache)) h?.mute(m);
  },
  setMusicMuted(m: boolean) {
    musicMuted = m;
    if (ambient) ambient.mute(m);
  },
  unlock: ensureUnlocked,

  play(id: SfxId, opts?: { volume?: number; rate?: number }) {
    if (sfxMuted) return;
    try {
      const h = getSfx(id);
      if (opts?.volume != null) h.volume(opts.volume);
      if (opts?.rate != null) h.rate(opts.rate);
      h.play();
    } catch {
      // ignore audio failures (autoplay, decoding etc.)
    }
  },

  stop(id: SfxId) {
    cache[id]?.stop();
  },

  playStep(element: ElementId | null | undefined) {
    if (!element) return;
    const map: Record<ElementId, SfxId> = {
      earth: "stepEarth",
      water: "stepWater",
      fire: "stepFire",
      air: "stepAir",
      ether: "stepEther",
    };
    this.play(map[element], { volume: 0.55 });
  },

  startAmbient() {
    if (!ambient) {
      ambient = new Howl({
        src: ["/audio/ambient.wav"],
        volume: 0.22,
        loop: true,
        html5: false,
      });
    }
    ambient.mute(musicMuted);
    if (!ambient.playing()) ambient.play();
  },

  stopAmbient() {
    ambient?.stop();
  },

  fadeOutAmbient(ms = 800) {
    if (!ambient) return;
    const from = ambient.volume();
    ambient.fade(from, 0, ms);
    setTimeout(() => ambient?.stop(), ms + 50);
  },
};

export type { SfxId };
