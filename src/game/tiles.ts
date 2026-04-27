export type TileType =
  | "go"
  | "principle"
  | "chance"
  | "community"
  | "tax"
  | "utility"
  | "jail"
  | "free_parking"
  | "go_to_jail";

export type ColorGroup = "saffron" | "white" | "green";

export type PrincipleId =
  | "notice"
  | "consent"
  | "purpose_limitation"
  | "data_minimisation"
  | "accuracy"
  | "storage_limitation"
  | "security_safeguards"
  | "accountability"
  | "data_principal_rights";

export interface Tile {
  index: number;
  name: string;
  type: TileType;
  colorGroup?: ColorGroup;
  basePrice?: number;
  baseRent?: number;
  principleId?: PrincipleId;
  taxAmount?: number;
}

/**
 * 28-tile board, clockwise starting from GO at index 0.
 *
 * Layout (corners at 0, 7, 14, 21):
 *   0  GO
 *   1..6   Saffron stretch (4 principles + 2 specials)
 *   7  Audit Jail (visit)
 *   8..13  White stretch
 *   14 Compliance Free Zone
 *   15..20 Green stretch
 *   21 Go to Audit Jail
 *   22..27 Mixed return stretch (utilities, chance, etc.)
 */

export const TILES: Tile[] = [
  // Corner
  { index: 0, name: "GO", type: "go" },

  // Saffron stretch
  { index: 1, name: "Notice", type: "principle", colorGroup: "saffron", basePrice: 120, baseRent: 14, principleId: "notice" },
  { index: 2, name: "Data Breach", type: "chance" },
  { index: 3, name: "Consent", type: "principle", colorGroup: "saffron", basePrice: 140, baseRent: 16, principleId: "consent" },
  { index: 4, name: "Purpose Limitation", type: "principle", colorGroup: "saffron", basePrice: 160, baseRent: 18, principleId: "purpose_limitation" },
  { index: 5, name: "DPO Office", type: "utility" },
  { index: 6, name: "Notice II", type: "principle", colorGroup: "saffron", basePrice: 180, baseRent: 22, principleId: "notice" },

  // Corner
  { index: 7, name: "Audit Jail", type: "jail" },

  // White stretch
  { index: 8, name: "Data Minimisation", type: "principle", colorGroup: "white", basePrice: 200, baseRent: 24, principleId: "data_minimisation" },
  { index: 9, name: "Compliance Bonus", type: "community" },
  { index: 10, name: "Accuracy", type: "principle", colorGroup: "white", basePrice: 220, baseRent: 26, principleId: "accuracy" },
  { index: 11, name: "DPDPA Penalty", type: "tax", taxAmount: 150 },
  { index: 12, name: "Storage Limitation", type: "principle", colorGroup: "white", basePrice: 240, baseRent: 30, principleId: "storage_limitation" },
  { index: 13, name: "Accuracy II", type: "principle", colorGroup: "white", basePrice: 260, baseRent: 32, principleId: "accuracy" },

  // Corner
  { index: 14, name: "Compliance Free Zone", type: "free_parking" },

  // Green stretch
  { index: 15, name: "Security Safeguards", type: "principle", colorGroup: "green", basePrice: 280, baseRent: 36, principleId: "security_safeguards" },
  { index: 16, name: "Privacy Audit Center", type: "utility" },
  { index: 17, name: "Accountability", type: "principle", colorGroup: "green", basePrice: 300, baseRent: 40, principleId: "accountability" },
  { index: 18, name: "Data Breach", type: "chance" },
  { index: 19, name: "Data Principal Rights", type: "principle", colorGroup: "green", basePrice: 320, baseRent: 44, principleId: "data_principal_rights" },
  { index: 20, name: "Rights II", type: "principle", colorGroup: "green", basePrice: 340, baseRent: 48, principleId: "data_principal_rights" },

  // Corner
  { index: 21, name: "Go to Audit Jail", type: "go_to_jail" },

  // Return stretch
  { index: 22, name: "Compliance Bonus", type: "community" },
  { index: 23, name: "Data Localization Center", type: "utility" },
  { index: 24, name: "Data Breach", type: "chance" },
  { index: 25, name: "DPDPA Penalty", type: "tax", taxAmount: 200 },
  { index: 26, name: "Compliance Bonus", type: "community" },
  { index: 27, name: "Data Breach", type: "chance" },
];

export const BOARD_SIZE = TILES.length; // 28
export const STARTING_CASH = 1500;
export const GO_REWARD = 200;
export const JAIL_TILE = 7;
export const GOTO_JAIL_TILE = 21;
export const UTILITY_RENT = 75;

// rent multiplier by layer (0=base, 1..4 = layered)
export const LAYER_MULTIPLIER = [1, 2, 4, 8, 16];

export function rentFor(tile: Tile, layers: number, ownerOwnsFullGroup: boolean): number {
  if (tile.type === "utility") return UTILITY_RENT;
  if (tile.type !== "principle" || !tile.baseRent) return 0;
  const base = tile.baseRent;
  const groupBonus = ownerOwnsFullGroup && layers === 0 ? 2 : 1; // double rent if full group, no layers
  return base * LAYER_MULTIPLIER[Math.min(layers, 4)] * groupBonus;
}

export function tilesInGroup(group: ColorGroup): number[] {
  return TILES.filter((t) => t.colorGroup === group).map((t) => t.index);
}
