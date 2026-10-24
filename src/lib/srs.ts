import type { Entry } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_INTERVAL = 1 / 24; // 1 hour in days

/** Apply a quiz/card outcome. Correct stretches interval; wrong brings it sooner. */
export function applyReview(entry: Entry, correct: boolean, now = Date.now()): Entry {
  if (!correct) {
    return {
      ...entry,
      status: "learning",
      lapses: entry.lapses + 1,
      interval: MIN_INTERVAL,
      dueAt: now + MIN_INTERVAL * DAY_MS,
      ease: Math.max(1.3, entry.ease - 0.2),
    };
  }

  const nextInterval =
    entry.reps === 0 ? 1 : entry.reps === 1 ? 3 : Math.round(entry.interval * entry.ease * 10) / 10;

  const status: Entry["status"] =
    nextInterval >= 21 ? "known" : entry.reps >= 0 ? "learning" : "new";

  return {
    ...entry,
    status: entry.status === "new" ? "learning" : status,
    reps: entry.reps + 1,
    interval: Math.max(MIN_INTERVAL, nextInterval),
    dueAt: now + Math.max(MIN_INTERVAL, nextInterval) * DAY_MS,
    ease: Math.min(2.8, entry.ease + 0.05),
  };
}

export function isDue(entry: Entry, now = Date.now()): boolean {
  return entry.dueAt <= now;
}

export function sortByDue(a: Entry, b: Entry): number {
  return a.dueAt - b.dueAt;
}
