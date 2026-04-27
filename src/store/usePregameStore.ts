import { create } from "zustand";
import type { ElementId } from "@/game/avatars";

export interface PregamePlayer {
  id: string;
  name: string;
  avatar: ElementId | null;
}

interface PregameState {
  playerCount: number;
  players: PregamePlayer[];
  currentPickerIdx: number;
  init: (count: number) => void;
  pickAvatar: (avatar: ElementId) => void;
  reset: () => void;
}

export const usePregameStore = create<PregameState>((set, get) => ({
  playerCount: 2,
  players: [],
  currentPickerIdx: 0,
  init: (count) => {
    set({
      playerCount: count,
      players: Array.from({ length: count }).map((_, i) => ({
        id: `p${i + 1}`,
        name: `Player ${i + 1}`,
        avatar: null,
      })),
      currentPickerIdx: 0,
    });
  },
  pickAvatar: (avatar) => {
    const { players, currentPickerIdx } = get();
    if (players.some((p) => p.avatar === avatar)) return;
    const next = [...players];
    next[currentPickerIdx] = { ...next[currentPickerIdx], avatar };
    set({
      players: next,
      currentPickerIdx: Math.min(currentPickerIdx + 1, next.length),
    });
  },
  reset: () =>
    set({ playerCount: 2, players: [], currentPickerIdx: 0 }),
}));
