import { create } from "zustand";
import {
  TILES,
  BOARD_SIZE,
  STARTING_CASH,
  GO_REWARD,
  JAIL_TILE,
  GOTO_JAIL_TILE,
  rentFor,
  tilesInGroup,
  type Tile,
  type ColorGroup,
} from "@/game/tiles";
import { BREACH_CARDS, BONUS_CARDS, drawRandom, type Card } from "@/game/cards";
import { type ElementId } from "@/game/avatars";

// ------- Types -------
export type GameMode = "solo" | "online" | "local";
export type GamePhase =
  | "setup"
  | "rolling"
  | "moving"
  | "resolving"
  | "mcq"
  | "buying"
  | "building"
  | "card"
  | "tax"
  | "turn-end"
  | "gameover";

export interface PlayerRT {
  id: string;
  name: string;
  avatar: ElementId | null;
  position: number;
  cash: number;
  ownedTiles: number[];
  inJail: boolean;
  jailTurns: number;
  mcqSkipTokens: number;
  isBankrupt: boolean;
  mcqsCorrect: number;
  mcqsTotal: number;
}

export interface TileState {
  tileIndex: number;
  ownerId: string | null;
  layers: number; // 0..4
}

export interface DiceState {
  value: number; // 1..6 (single die for compact 28-tile board)
  doubles: boolean;
  isRolling: boolean;
}

export interface MCQContext {
  questionId: string;
  question: string;
  options: string[];
  correctIndex: number;
  principle: string;
  reason: "purchase" | "rent";  // why we're asking
  rentOwed?: number;
  ownerId?: string;
  tileIndex: number;
}

export interface BuyContext {
  tileIndex: number;
  price: number;
}

export interface BuildContext {
  tileIndex: number;
  currentLayers: number;
  cost: number;
}

export interface CardContext {
  card: Card;
  deck: "breach" | "bonus";
}

export interface TaxContext {
  amount: number;
  tileIndex: number;
}

export interface ToastMsg {
  id: number;
  text: string;
  tone: "info" | "success" | "danger" | "gold";
}

// ------- UI Slice -------
interface UISlice {
  soundEnabled: boolean;
  musicEnabled: boolean;
  toggleSound: () => void;
  toggleMusic: () => void;
  toasts: ToastMsg[];
  pushToast: (text: string, tone?: ToastMsg["tone"]) => void;
  clearToast: (id: number) => void;
}

// ------- Multiplayer Slice -------
interface MultiplayerSlice {
  mode: GameMode | null;
  playerCount: number;
  roomCode: string | null;
  isHost: boolean;
  setMode: (m: GameMode | null) => void;
  setPlayerCount: (n: number) => void;
  setRoomCode: (c: string | null) => void;
  setIsHost: (h: boolean) => void;
}

// ------- Game Slice -------
interface GameSlice {
  phase: GamePhase;
  players: PlayerRT[];
  currentPlayerIndex: number;
  tileStates: TileState[];
  dice: DiceState;
  round: number;
  log: string[];

  // ephemeral contexts
  mcq: MCQContext | null;
  buy: BuyContext | null;
  build: BuildContext | null;
  card: CardContext | null;
  tax: TaxContext | null;
  winnerId: string | null;

  // setup
  setupPlayers: (defs: { id: string; name: string; avatar: ElementId }[]) => void;

  // turn lifecycle
  rollDice: () => void;
  finishMovement: () => void; // called by UI after avatar animation completes
  resolveLanding: () => Tile;

  // MCQ
  setMcqContext: (ctx: MCQContext | null) => void;
  answerMcq: (chosenIndex: number) => "correct" | "wrong";

  // buy / build
  setBuyContext: (ctx: BuyContext | null) => void;
  buyTile: (accept: boolean) => void;
  setBuildContext: (ctx: BuildContext | null) => void;
  buildLayer: (accept: boolean) => void;

  // cards
  setCardContext: (ctx: CardContext | null) => void;
  applyCard: () => void;

  // tax
  setTaxContext: (ctx: TaxContext | null) => void;
  applyTax: () => void;

  // skip token
  useSkipToken: () => boolean;

  // end turn
  endTurn: () => void;

  // logging
  addLog: (text: string) => void;
  resetGame: () => void;
}

export type RajaStore = GameSlice & UISlice & MultiplayerSlice;

// ------- Helpers -------
function freshTileStates(): TileState[] {
  return TILES.map((t) => ({ tileIndex: t.index, ownerId: null, layers: 0 }));
}

function ownerOwnsFullGroup(
  ownerId: string,
  group: ColorGroup,
  states: TileState[],
): boolean {
  const groupTiles = tilesInGroup(group);
  return groupTiles.every(
    (idx) => states.find((s) => s.tileIndex === idx)?.ownerId === ownerId,
  );
}

function nextActivePlayerIdx(players: PlayerRT[], from: number): number {
  if (players.every((p) => p.isBankrupt)) return from;
  let idx = from;
  for (let i = 0; i < players.length; i++) {
    idx = (idx + 1) % players.length;
    if (!players[idx].isBankrupt) return idx;
  }
  return from;
}

function activeCount(players: PlayerRT[]): number {
  return players.filter((p) => !p.isBankrupt).length;
}

let toastSeq = 0;

// ------- Store -------
export const useGameStore = create<RajaStore>((set, get) => ({
  // ===== UI =====
  soundEnabled: true,
  musicEnabled: true,
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
  toasts: [],
  pushToast: (text, tone = "info") => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }));
    setTimeout(() => get().clearToast(id), 3500);
  },
  clearToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // ===== Multiplayer =====
  mode: null,
  playerCount: 2,
  roomCode: null,
  isHost: false,
  setMode: (mode) => set({ mode }),
  setPlayerCount: (playerCount) => set({ playerCount }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setIsHost: (isHost) => set({ isHost }),

  // ===== Game =====
  phase: "setup",
  players: [],
  currentPlayerIndex: 0,
  tileStates: freshTileStates(),
  dice: { value: 1, doubles: false, isRolling: false },
  round: 1,
  log: [],
  mcq: null,
  buy: null,
  build: null,
  card: null,
  tax: null,
  winnerId: null,

  setupPlayers: (defs) => {
    const players: PlayerRT[] = defs.map((d) => ({
      id: d.id,
      name: d.name,
      avatar: d.avatar,
      position: 0,
      cash: STARTING_CASH,
      ownedTiles: [],
      inJail: false,
      jailTurns: 0,
      mcqSkipTokens: 0,
      isBankrupt: false,
      mcqsCorrect: 0,
      mcqsTotal: 0,
    }));
    set({
      players,
      currentPlayerIndex: 0,
      tileStates: freshTileStates(),
      phase: "rolling",
      round: 1,
      log: [`Battle begins! ${players[0].name} rolls first.`],
      dice: { value: 1, doubles: false, isRolling: false },
      mcq: null, buy: null, build: null, card: null, tax: null,
      winnerId: null,
    });
  },

  addLog: (text) =>
    set((s) => ({ log: [...s.log.slice(-49), text] })),

  rollDice: () => {
    if (get().phase !== "rolling") return;
    set({ dice: { value: 1, doubles: false, isRolling: true } });
    const value = 1 + Math.floor(Math.random() * 6);
    setTimeout(() => {
      const player = get().players[get().currentPlayerIndex];
      // Jail handling
      if (player.inJail) {
        // simple: rolling 6 frees you, else stay (max 3 turns)
        if (value === 6) {
          set((s) => {
            const players = [...s.players];
            players[s.currentPlayerIndex] = { ...player, inJail: false, jailTurns: 0 };
            return { players };
          });
          get().addLog(`${player.name} rolled a 6 and escapes Audit Jail!`);
        } else {
          const newJailTurns = player.jailTurns + 1;
          if (newJailTurns >= 3) {
            // forced release after 3 turns, pay fine
            set((s) => {
              const players = [...s.players];
              players[s.currentPlayerIndex] = {
                ...player, inJail: false, jailTurns: 0, cash: player.cash - 100,
              };
              return { players };
            });
            get().addLog(`${player.name} pays ₹100 fine and leaves Audit Jail.`);
          } else {
            set((s) => {
              const players = [...s.players];
              players[s.currentPlayerIndex] = { ...player, jailTurns: newJailTurns };
              return {
                players,
                dice: { value, doubles: false, isRolling: false },
                phase: "turn-end",
              };
            });
            get().addLog(`${player.name} rolled ${value} — still in Audit Jail (${newJailTurns}/3).`);
            return;
          }
        }
      }
      set({ dice: { value, doubles: false, isRolling: false }, phase: "moving" });
      get().addLog(`${player.name} rolled ${value}.`);
    }, 800);
  },

  finishMovement: () => {
    // Move the player forward by dice.value, handle GO
    const { dice, players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    let newPos = (player.position + dice.value) % BOARD_SIZE;
    let cashGain = 0;
    if (player.position + dice.value >= BOARD_SIZE) {
      cashGain = GO_REWARD;
    }
    set((s) => {
      const ps = [...s.players];
      ps[currentPlayerIndex] = { ...player, position: newPos, cash: player.cash + cashGain };
      return { players: ps };
    });
    if (cashGain) get().addLog(`${player.name} passed GO and collected ₹${cashGain}.`);
    set({ phase: "resolving" });
  },

  resolveLanding: () => {
    const { players, currentPlayerIndex, tileStates } = get();
    const player = players[currentPlayerIndex];
    const tile = TILES[player.position];

    switch (tile.type) {
      case "go":
        get().addLog(`${player.name} rests on GO.`);
        set({ phase: "turn-end" });
        return tile;

      case "free_parking":
        get().addLog(`${player.name} relaxes in the Compliance Free Zone.`);
        set({ phase: "turn-end" });
        return tile;

      case "jail":
        get().addLog(`${player.name} is just visiting Audit Jail.`);
        set({ phase: "turn-end" });
        return tile;

      case "go_to_jail":
        set((s) => {
          const ps = [...s.players];
          ps[currentPlayerIndex] = { ...player, position: JAIL_TILE, inJail: true, jailTurns: 0 };
          return { players: ps, phase: "turn-end" };
        });
        get().addLog(`${player.name} sent to Audit Jail!`);
        return tile;

      case "tax":
        set({
          phase: "tax",
          tax: { amount: tile.taxAmount ?? 100, tileIndex: tile.index },
        });
        return tile;

      case "chance": {
        const card = drawRandom(BREACH_CARDS);
        set({ phase: "card", card: { card, deck: "breach" } });
        return tile;
      }

      case "community": {
        const card = drawRandom(BONUS_CARDS);
        set({ phase: "card", card: { card, deck: "bonus" } });
        return tile;
      }

      case "utility": {
        // simple flat rent if owned; ownership not tracked for utilities here (extension point)
        get().addLog(`${player.name} visits the ${tile.name}.`);
        set({ phase: "turn-end" });
        return tile;
      }

      case "principle": {
        const state = tileStates.find((t) => t.tileIndex === tile.index)!;
        if (!state.ownerId) {
          // unowned: trigger purchase MCQ
          set({
            phase: "mcq",
            mcq: {
              questionId: "",
              question: "",
              options: [],
              correctIndex: 0,
              principle: tile.principleId ?? "",
              reason: "purchase",
              tileIndex: tile.index,
            },
          });
          return tile;
        }
        if (state.ownerId === player.id) {
          // own tile — maybe build a layer
          if (tile.colorGroup && ownerOwnsFullGroup(player.id, tile.colorGroup, tileStates) && state.layers < 4) {
            const cost = Math.round((tile.basePrice ?? 100) * 0.6);
            set({
              phase: "building",
              build: {
                tileIndex: tile.index,
                currentLayers: state.layers,
                cost,
              },
            });
            return tile;
          }
          get().addLog(`${player.name} rests on their own ${tile.name}.`);
          set({ phase: "turn-end" });
          return tile;
        }
        // owned by other player — MCQ for rent
        const owner = players.find((p) => p.id === state.ownerId)!;
        const fullGroup = tile.colorGroup
          ? ownerOwnsFullGroup(owner.id, tile.colorGroup, tileStates)
          : false;
        const rent = rentFor(tile, state.layers, fullGroup);
        set({
          phase: "mcq",
          mcq: {
            questionId: "",
            question: "",
            options: [],
            correctIndex: 0,
            principle: tile.principleId ?? "",
            reason: "rent",
            rentOwed: rent,
            ownerId: owner.id,
            tileIndex: tile.index,
          },
        });
        return tile;
      }
    }
    set({ phase: "turn-end" });
    return tile;
  },

  setMcqContext: (mcq) => set({ mcq }),

  answerMcq: (chosenIndex) => {
    const { mcq, players, currentPlayerIndex, tileStates } = get();
    if (!mcq) return "wrong";
    const player = players[currentPlayerIndex];
    const correct = chosenIndex === mcq.correctIndex;
    const tile = TILES[mcq.tileIndex];

    // record stats
    set((s) => {
      const ps = [...s.players];
      ps[currentPlayerIndex] = {
        ...player,
        mcqsCorrect: player.mcqsCorrect + (correct ? 1 : 0),
        mcqsTotal: player.mcqsTotal + 1,
      };
      return { players: ps };
    });

    if (mcq.reason === "purchase") {
      if (correct) {
        get().addLog(`${player.name} answered correctly. May purchase ${tile.name}.`);
        set({
          phase: "buying",
          buy: { tileIndex: tile.index, price: tile.basePrice ?? 100 },
          mcq: null,
        });
      } else {
        get().addLog(`${player.name} answered wrong — cannot buy ${tile.name} this turn.`);
        get().pushToast("Wrong answer — purchase forfeited", "danger");
        set({ phase: "turn-end", mcq: null });
      }
    } else {
      // rent
      const rent = mcq.rentOwed ?? 0;
      const owner = players.find((p) => p.id === mcq.ownerId);
      if (correct) {
        get().addLog(`${player.name} answered correctly — no rent owed on ${tile.name}.`);
        get().pushToast("Correct! Rent waived", "success");
      } else if (owner) {
        // pay rent
        const newPlayers = [...get().players];
        const idxOwner = newPlayers.findIndex((p) => p.id === owner.id);
        const idxMe = currentPlayerIndex;
        const me = newPlayers[idxMe];
        const pay = Math.min(me.cash, rent);
        newPlayers[idxMe] = { ...me, cash: me.cash - pay };
        newPlayers[idxOwner] = { ...newPlayers[idxOwner], cash: newPlayers[idxOwner].cash + pay };
        set({ players: newPlayers });
        get().addLog(`${player.name} paid ₹${pay} rent to ${owner.name}.`);
        if (me.cash - pay <= 0 && rent > me.cash) {
          // bankrupt
          get().addLog(`${player.name} is bankrupt!`);
          // mark bankrupt + release tiles
          const tilesReset = get().tileStates.map((s) =>
            s.ownerId === player.id ? { ...s, ownerId: null, layers: 0 } : s,
          );
          const ps2 = get().players.map((p) =>
            p.id === player.id ? { ...p, isBankrupt: true, ownedTiles: [] } : p,
          );
          set({ players: ps2, tileStates: tilesReset });
        }
      }
      set({ phase: "turn-end", mcq: null });
    }

    void tileStates; // keep ref
    return correct ? "correct" : "wrong";
  },

  setBuyContext: (buy) => set({ buy }),
  buyTile: (accept) => {
    const { buy, players, currentPlayerIndex } = get();
    if (!buy) return;
    const player = players[currentPlayerIndex];
    if (accept && player.cash >= buy.price) {
      const ps = [...players];
      ps[currentPlayerIndex] = {
        ...player,
        cash: player.cash - buy.price,
        ownedTiles: [...player.ownedTiles, buy.tileIndex],
      };
      const ts = get().tileStates.map((s) =>
        s.tileIndex === buy.tileIndex ? { ...s, ownerId: player.id, layers: 0 } : s,
      );
      set({ players: ps, tileStates: ts });
      get().addLog(`${player.name} purchased ${TILES[buy.tileIndex].name} for ₹${buy.price}.`);
      get().pushToast(`Acquired ${TILES[buy.tileIndex].name}!`, "gold");
    } else if (accept) {
      get().pushToast("Insufficient cash", "danger");
    }
    set({ phase: "turn-end", buy: null });
  },

  setBuildContext: (build) => set({ build }),
  buildLayer: (accept) => {
    const { build, players, currentPlayerIndex } = get();
    if (!build) return;
    const player = players[currentPlayerIndex];
    if (accept && player.cash >= build.cost) {
      const ps = [...players];
      ps[currentPlayerIndex] = { ...player, cash: player.cash - build.cost };
      const ts = get().tileStates.map((s) =>
        s.tileIndex === build.tileIndex ? { ...s, layers: s.layers + 1 } : s,
      );
      set({ players: ps, tileStates: ts });
      get().addLog(
        `${player.name} built Compliance Layer ${build.currentLayers + 1} on ${TILES[build.tileIndex].name}.`,
      );
      get().pushToast(`Layer ${build.currentLayers + 1} built!`, "gold");
    }
    set({ phase: "turn-end", build: null });
  },

  setCardContext: (card) => set({ card }),
  applyCard: () => {
    const { card, players, currentPlayerIndex } = get();
    if (!card) return;
    const eff = card.card.effect;
    let player = { ...players[currentPlayerIndex] };
    let ps = [...players];

    switch (eff.kind) {
      case "cash":
        player = { ...player, cash: player.cash + eff.amount };
        ps[currentPlayerIndex] = player;
        break;
      case "skip_token":
        player = { ...player, mcqSkipTokens: player.mcqSkipTokens + 1 };
        ps[currentPlayerIndex] = player;
        break;
      case "go_to_jail":
        player = { ...player, position: JAIL_TILE, inJail: true, jailTurns: 0 };
        ps[currentPlayerIndex] = player;
        break;
      case "move_to": {
        if (eff.collectGo && eff.tileIndex < player.position) {
          player = { ...player, cash: player.cash + GO_REWARD };
        }
        player = { ...player, position: eff.tileIndex };
        ps[currentPlayerIndex] = player;
        break;
      }
      case "move_relative": {
        const newPos = (player.position + eff.steps + BOARD_SIZE) % BOARD_SIZE;
        player = { ...player, position: newPos };
        ps[currentPlayerIndex] = player;
        break;
      }
      case "pay_per_tile": {
        const owed = player.ownedTiles.length * eff.perTile;
        player = { ...player, cash: player.cash - owed };
        ps[currentPlayerIndex] = player;
        break;
      }
      case "everyone_pays": {
        // amount: positive = others pay current; negative = current pays others
        ps = ps.map((p, i) => {
          if (i === currentPlayerIndex || p.isBankrupt) return p;
          if (eff.amount > 0) return { ...p, cash: p.cash - eff.amount };
          return { ...p, cash: p.cash + Math.abs(eff.amount) };
        });
        const delta = ps.filter((p, i) => i !== currentPlayerIndex && !p.isBankrupt).length * eff.amount;
        ps[currentPlayerIndex] = { ...ps[currentPlayerIndex], cash: ps[currentPlayerIndex].cash + delta };
        break;
      }
    }
    set({ players: ps });
    get().addLog(`Card: ${card.card.text}`);
    get().pushToast(card.card.text, card.deck === "bonus" ? "success" : "danger");

    // For move cards, also resolve landing on the new tile (chain)
    if (eff.kind === "move_to" || eff.kind === "move_relative") {
      set({ card: null });
      // Slight delay for UX
      setTimeout(() => get().resolveLanding(), 300);
      return;
    }
    set({ phase: "turn-end", card: null });
  },

  setTaxContext: (tax) => set({ tax }),
  applyTax: () => {
    const { tax, players, currentPlayerIndex } = get();
    if (!tax) return;
    const player = players[currentPlayerIndex];
    const ps = [...players];
    const pay = Math.min(player.cash, tax.amount);
    ps[currentPlayerIndex] = { ...player, cash: player.cash - pay };
    set({ players: ps });
    get().addLog(`${player.name} paid ₹${pay} DPDPA penalty.`);
    if (player.cash - pay <= 0 && tax.amount > player.cash) {
      const ps2 = get().players.map((p) =>
        p.id === player.id ? { ...p, isBankrupt: true, ownedTiles: [] } : p,
      );
      const tilesReset = get().tileStates.map((s) =>
        s.ownerId === player.id ? { ...s, ownerId: null, layers: 0 } : s,
      );
      set({ players: ps2, tileStates: tilesReset });
    }
    set({ phase: "turn-end", tax: null });
  },

  useSkipToken: () => {
    const { mcq, players, currentPlayerIndex } = get();
    if (!mcq) return false;
    const player = players[currentPlayerIndex];
    if (player.mcqSkipTokens <= 0) return false;
    const ps = [...players];
    ps[currentPlayerIndex] = { ...player, mcqSkipTokens: player.mcqSkipTokens - 1 };
    set({ players: ps });
    get().addLog(`${player.name} used a Skip Token.`);
    // skip is treated as a wrong answer for purchase, but waives rent
    if (mcq.reason === "rent") {
      get().pushToast("Skip used — rent waived", "gold");
      set({ phase: "turn-end", mcq: null });
    } else {
      get().pushToast("Skip used — purchase forfeited", "info");
      set({ phase: "turn-end", mcq: null });
    }
    return true;
  },

  endTurn: () => {
    const { players, currentPlayerIndex } = get();
    // Check winner
    if (activeCount(players) <= 1) {
      const winner = players.find((p) => !p.isBankrupt) ?? null;
      set({ phase: "gameover", winnerId: winner?.id ?? null });
      return;
    }
    const next = nextActivePlayerIdx(players, currentPlayerIndex);
    const wrappedRound = next <= currentPlayerIndex ? get().round + 1 : get().round;
    set({
      currentPlayerIndex: next,
      round: wrappedRound,
      phase: "rolling",
      mcq: null, buy: null, build: null, card: null, tax: null,
    });
    get().addLog(`— ${players[next].name}'s turn —`);
  },

  resetGame: () =>
    set({
      phase: "setup",
      players: [],
      currentPlayerIndex: 0,
      tileStates: freshTileStates(),
      dice: { value: 1, doubles: false, isRolling: false },
      round: 1,
      log: [],
      mcq: null, buy: null, build: null, card: null, tax: null,
      winnerId: null,
    }),
}));
