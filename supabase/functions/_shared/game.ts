// Shared game constants/helpers (mirrors src/game/tiles.ts on the server).

export type ColorGroup = "saffron" | "white" | "green";

export interface Tile {
  index: number;
  name: string;
  type:
    | "go"
    | "principle"
    | "chance"
    | "community"
    | "tax"
    | "utility"
    | "jail"
    | "free_parking"
    | "go_to_jail";
  colorGroup?: ColorGroup;
  basePrice?: number;
  baseRent?: number;
  principleId?: string;
  taxAmount?: number;
}

export const TILES: Tile[] = [
  { index: 0, name: "GO", type: "go" },
  { index: 1, name: "Notice", type: "principle", colorGroup: "saffron", basePrice: 120, baseRent: 14, principleId: "notice" },
  { index: 2, name: "Data Breach", type: "chance" },
  { index: 3, name: "Consent", type: "principle", colorGroup: "saffron", basePrice: 140, baseRent: 16, principleId: "consent" },
  { index: 4, name: "Purpose Limitation", type: "principle", colorGroup: "saffron", basePrice: 160, baseRent: 18, principleId: "purpose_limitation" },
  { index: 5, name: "DPO Office", type: "utility" },
  { index: 6, name: "Notice II", type: "principle", colorGroup: "saffron", basePrice: 180, baseRent: 22, principleId: "notice" },
  { index: 7, name: "Audit Jail", type: "jail" },
  { index: 8, name: "Data Minimisation", type: "principle", colorGroup: "white", basePrice: 200, baseRent: 24, principleId: "data_minimisation" },
  { index: 9, name: "Compliance Bonus", type: "community" },
  { index: 10, name: "Accuracy", type: "principle", colorGroup: "white", basePrice: 220, baseRent: 26, principleId: "accuracy" },
  { index: 11, name: "DPDPA Penalty", type: "tax", taxAmount: 150 },
  { index: 12, name: "Storage Limitation", type: "principle", colorGroup: "white", basePrice: 240, baseRent: 30, principleId: "storage_limitation" },
  { index: 13, name: "Accuracy II", type: "principle", colorGroup: "white", basePrice: 260, baseRent: 32, principleId: "accuracy" },
  { index: 14, name: "Compliance Free Zone", type: "free_parking" },
  { index: 15, name: "Security Safeguards", type: "principle", colorGroup: "green", basePrice: 280, baseRent: 36, principleId: "security_safeguards" },
  { index: 16, name: "Privacy Audit Center", type: "utility" },
  { index: 17, name: "Accountability", type: "principle", colorGroup: "green", basePrice: 300, baseRent: 40, principleId: "accountability" },
  { index: 18, name: "Data Breach", type: "chance" },
  { index: 19, name: "Data Principal Rights", type: "principle", colorGroup: "green", basePrice: 320, baseRent: 44, principleId: "data_principal_rights" },
  { index: 20, name: "Rights II", type: "principle", colorGroup: "green", basePrice: 340, baseRent: 48, principleId: "data_principal_rights" },
  { index: 21, name: "Go to Audit Jail", type: "go_to_jail" },
  { index: 22, name: "Compliance Bonus", type: "community" },
  { index: 23, name: "Data Localization Center", type: "utility" },
  { index: 24, name: "Data Breach", type: "chance" },
  { index: 25, name: "DPDPA Penalty", type: "tax", taxAmount: 200 },
  { index: 26, name: "Compliance Bonus", type: "community" },
  { index: 27, name: "Data Breach", type: "chance" },
];

export const BOARD_SIZE = TILES.length;
export const LAYER_MULTIPLIER = [1, 2, 4, 8, 16];

export function tilesInGroup(group: ColorGroup): number[] {
  return TILES.filter((t) => t.colorGroup === group).map((t) => t.index);
}
