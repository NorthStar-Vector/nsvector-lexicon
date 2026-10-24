import { normalizeLemma, newId } from "../lib/normalize";
import type { Entry } from "../lib/types";

/** Demo pack so an empty Lex can be tried end-to-end immediately. */
export const SEED_PACK: readonly {
  surface: string;
  gloss: string;
  context: string;
}[] = [
  {
    surface: "ember",
    gloss: "тлеющий уголёк",
    context: "An ember glowed in the grate long after midnight.",
  },
  {
    surface: "reluctant",
    gloss: "неохотный, вынужденный",
    context: "She gave a reluctant nod and closed the book.",
  },
  {
    surface: "glimpse",
    gloss: "мимолётный взгляд / проблеск",
    context: "He caught a glimpse of the harbor through the fog.",
  },
  {
    surface: "sturdy",
    gloss: "крепкий, надёжный",
    context: "The sturdy desk had survived three apartments.",
  },
  {
    surface: "murmur",
    gloss: "бормотать / тихий ропот",
    context: "A murmur of agreement moved through the room.",
  },
  {
    surface: "scarce",
    gloss: "скудный, редкий",
    context: "Quiet hours were scarce that winter.",
  },
  {
    surface: "linger",
    gloss: "задерживаться, не уходить",
    context: "The smell of coffee lingered in the hallway.",
  },
  {
    surface: "brittle",
    gloss: "хрупкий, ломкий",
    context: "The brittle ice cracked under the first step.",
  },
] as const;

export function buildSeedEntries(now = Date.now()): Entry[] {
  return SEED_PACK.map((item, i) => {
    const surface = item.surface;
    return {
      id: newId(),
      lemma: normalizeLemma(surface),
      surface,
      gloss: item.gloss,
      context: item.context,
      status: "new" as const,
      createdAt: now - i * 1000,
      dueAt: now,
      interval: 0,
      ease: 2.3,
      reps: 0,
      lapses: 0,
    };
  });
}
