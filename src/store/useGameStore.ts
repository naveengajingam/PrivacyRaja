import { create } from "zustand";

// === Types ===
export type ElementId = "earth" | "water" | "fire" | "air" | "ether";
export type GameMode = "solo" | "online" | "local";
export type GamePhase = "loading" | "lobby" | "playing" | "ended";

export interface Player {
  id: string;
  name: string;
  element: ElementId | null;
  position: number; // 0..27
  cash: number;
  ownedTiles: number[];
  isBot?: boolean;
}

// === Game Slice ===
interface GameSlice {
  phase: GamePhase;
  players: Player[];
  currentPlayerIdx: number;
  diceRoll: [number, number] | null;
  setPhase: (p: GamePhase) => void;
  resetGame: () => void;
}

// === UI Slice ===
interface UISlice {
  soundEnabled: boolean;
  musicEnabled: boolean;
  toggleSound: () => void;
  toggleMusic: () => void;
}

// === Multiplayer Slice ===
interface MultiplayerSlice {
  mode: GameMode | null;
  roomCode: string | null;
  isHost: boolean;
  setMode: (m: GameMode | null) => void;
  setRoomCode: (c: string | null) => void;
  setIsHost: (h: boolean) => void;
}

export type RajaStore = GameSlice & UISlice & MultiplayerSlice;

export const useGameStore = create<RajaStore>((set) => ({
  // game
  phase: "loading",
  players: [],
  currentPlayerIdx: 0,
  diceRoll: null,
  setPhase: (phase) => set({ phase }),
  resetGame: () =>
    set({ phase: "loading", players: [], currentPlayerIdx: 0, diceRoll: null }),

  // ui
  soundEnabled: true,
  musicEnabled: true,
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),

  // multiplayer
  mode: null,
  roomCode: null,
  isHost: false,
  setMode: (mode) => set({ mode }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setIsHost: (isHost) => set({ isHost }),
}));
