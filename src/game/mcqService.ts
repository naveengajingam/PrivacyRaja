import type { PrincipleId } from "./tiles";

export interface MCQ {
  id: string;
  principle: PrincipleId;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  options: string[];
  correctIndex: number;
  domain: string;
}

let cachedBank: MCQ[] | null = null;

export async function loadMcqBank(): Promise<MCQ[]> {
  if (cachedBank) return cachedBank;
  const res = await fetch("/mcq-bank.json");
  const data = (await res.json()) as { questions: MCQ[] };
  cachedBank = data.questions;
  return cachedBank;
}

export function difficultyForRound(round: number): "easy" | "medium" | "hard" {
  if (round <= 3) return "easy";
  if (round <= 6) return "medium";
  return "hard";
}

export function getMcqForPrinciple(
  bank: MCQ[],
  principle: PrincipleId,
  round: number,
): MCQ | null {
  const targetDiff = difficultyForRound(round);
  const matchingDiff = bank.filter(
    (q) => q.principle === principle && q.difficulty === targetDiff,
  );
  const fallback = bank.filter((q) => q.principle === principle);
  const pool = matchingDiff.length > 0 ? matchingDiff : fallback;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
