export interface Card {
  id: string;
  text: string;
  effect: CardEffect;
}

export type CardEffect =
  | { kind: "cash"; amount: number }                 // +/- to current player
  | { kind: "move_to"; tileIndex: number; collectGo?: boolean }
  | { kind: "move_relative"; steps: number }
  | { kind: "go_to_jail" }
  | { kind: "skip_token" }                           // gain MCQ skip token
  | { kind: "pay_per_tile"; perTile: number }        // pay X per owned principle
  | { kind: "everyone_pays"; amount: number };       // each other player → current

export const BREACH_CARDS: Card[] = [
  { id: "b1",  text: "Unencrypted laptop stolen — pay ₹100 in remediation.", effect: { kind: "cash", amount: -100 } },
  { id: "b2",  text: "Phishing attack on call centre. Pay ₹150.", effect: { kind: "cash", amount: -150 } },
  { id: "b3",  text: "Ransomware! Pay ₹50 per principle you own.", effect: { kind: "pay_per_tile", perTile: 50 } },
  { id: "b4",  text: "Reported by whistleblower — Go directly to Audit Jail.", effect: { kind: "go_to_jail" } },
  { id: "b5",  text: "Vendor leaked your data. Pay ₹200.", effect: { kind: "cash", amount: -200 } },
  { id: "b6",  text: "Public exposure on misconfigured S3 bucket. Pay ₹120.", effect: { kind: "cash", amount: -120 } },
  { id: "b7",  text: "Insider misuse detected. Move back 3 tiles.", effect: { kind: "move_relative", steps: -3 } },
  { id: "b8",  text: "DPDPB notice received. Pay ₹80.", effect: { kind: "cash", amount: -80 } },
  { id: "b9",  text: "Lost backup tapes. Pay ₹160.", effect: { kind: "cash", amount: -160 } },
  { id: "b10", text: "Dark-pattern lawsuit filed against you. Pay ₹220.", effect: { kind: "cash", amount: -220 } },
  { id: "b11", text: "API key leaked on GitHub. Pay ₹140.", effect: { kind: "cash", amount: -140 } },
  { id: "b12", text: "Customer SAR ignored — every other player collects ₹50 from you.", effect: { kind: "everyone_pays", amount: -50 } },
];

export const BONUS_CARDS: Card[] = [
  { id: "c1",  text: "Successful internal audit — collect ₹150.", effect: { kind: "cash", amount: 150 } },
  { id: "c2",  text: "Won the 'Privacy First' award — collect ₹100.", effect: { kind: "cash", amount: 100 } },
  { id: "c3",  text: "DPO certification — gain 1 MCQ Skip Token.", effect: { kind: "skip_token" } },
  { id: "c4",  text: "Strong consent UX — advance to GO.", effect: { kind: "move_to", tileIndex: 0, collectGo: true } },
  { id: "c5",  text: "Data minimisation savings — collect ₹120.", effect: { kind: "cash", amount: 120 } },
  { id: "c6",  text: "Tabletop exercise complete — collect ₹80.", effect: { kind: "cash", amount: 80 } },
  { id: "c7",  text: "Privacy by Design refund — collect ₹60.", effect: { kind: "cash", amount: 60 } },
  { id: "c8",  text: "Compliance roadshow — every player pays you ₹40.", effect: { kind: "everyone_pays", amount: 40 } },
  { id: "c9",  text: "Vendor risk score upgraded — collect ₹110.", effect: { kind: "cash", amount: 110 } },
  { id: "c10", text: "Board approved the privacy budget — collect ₹200.", effect: { kind: "cash", amount: 200 } },
  { id: "c11", text: "Trained the workforce — gain 1 MCQ Skip Token.", effect: { kind: "skip_token" } },
  { id: "c12", text: "DPDPA newsletter mention — collect ₹70.", effect: { kind: "cash", amount: 70 } },
];

export function drawRandom<T>(deck: T[]): T {
  return deck[Math.floor(Math.random() * deck.length)];
}
