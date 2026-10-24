import type { Entry } from "./types";

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

const FALLBACK_DISTRACTORS = [
  "тихая пауза",
  "двигаться осторожно",
  "что-то неожиданное",
  "короткая задержка",
  "едва заметный",
  "смотреть внимательно",
  "открытый вопрос",
  "без спешки",
];

/** Build 4 gloss options for a lemma quiz (1 correct + up to 3 from bank). */
export function buildQuizOptions(target: Entry, bank: Entry[]): string[] {
  const correct = target.gloss.trim() || target.surface;
  const pool = bank
    .filter((e) => e.id !== target.id && e.gloss.trim() && e.gloss.trim() !== correct)
    .map((e) => e.gloss.trim());

  const unique = [...new Set(pool)];
  const distractors: string[] = [];

  for (const g of shuffle(unique)) {
    if (distractors.length >= 3) break;
    distractors.push(g);
  }

  for (const g of shuffle(FALLBACK_DISTRACTORS)) {
    if (distractors.length >= 3) break;
    if (g !== correct && !distractors.includes(g)) distractors.push(g);
  }

  return shuffle([correct, ...distractors.slice(0, 3)]);
}
