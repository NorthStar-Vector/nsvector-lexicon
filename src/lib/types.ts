export type EntryStatus = "new" | "learning" | "known";

export type Entry = {
  id: string;
  /** Normalized lowercase lemma for dedupe / search */
  lemma: string;
  /** As the learner saw it */
  surface: string;
  /** User-authored translation / gloss */
  gloss: string;
  /** Optional sentence where it appeared */
  context: string;
  status: EntryStatus;
  createdAt: number;
  /** Next review time (ms) */
  dueAt: number;
  /** Days until next review after a correct answer */
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
};

export type Screen = "home" | "catch" | "bank" | "cards" | "quiz";
