export type ElementId = "earth" | "water" | "fire" | "air" | "ether";

export interface AvatarDef {
  id: ElementId;
  name: string;       // Sanskrit name
  english: string;    // English element
  symbol: string;     // emoji glyph
  color: string;      // brand colour
  glow: string;       // shadow glow color
  movement: string;   // one-line description
}

export const AVATARS: AvatarDef[] = [
  {
    id: "earth",
    name: "Prithvi",
    english: "Earth",
    symbol: "🪨",
    color: "#A0522D",
    glow: "#D4A017",
    movement: "Solid stomp — leaves dust on every tile crossed.",
  },
  {
    id: "water",
    name: "Jal",
    english: "Water",
    symbol: "💧",
    color: "#1E90FF",
    glow: "#5DADE2",
    movement: "Flowing glide — ripples ahead before each step.",
  },
  {
    id: "fire",
    name: "Agni",
    english: "Fire",
    symbol: "🔥",
    color: "#FF4500",
    glow: "#FF9933",
    movement: "Blazing dash — scorch trail behind each tile.",
  },
  {
    id: "air",
    name: "Vayu",
    english: "Wind",
    symbol: "🌬",
    color: "#87CEEB",
    glow: "#FFFFFF",
    movement: "Wind leap — small hop arc between tiles.",
  },
  {
    id: "ether",
    name: "Akasha",
    english: "Ether",
    symbol: "✨",
    color: "#9370DB",
    glow: "#D4A017",
    movement: "Cosmic shimmer — fades in and out as it moves.",
  },
];

export function getAvatar(id: ElementId | null | undefined): AvatarDef | null {
  if (!id) return null;
  return AVATARS.find((a) => a.id === id) ?? null;
}
