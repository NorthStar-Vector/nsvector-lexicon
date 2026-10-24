import { describe, expect, it } from "vitest";
import { applyReview, isDue } from "./srs";
import type { Entry } from "./types";

function base(over: Partial<Entry> = {}): Entry {
  return {
    id: "1",
    lemma: "ember",
    surface: "ember",
    gloss: "тлеющий уголёк",
    context: "",
    status: "new",
    createdAt: 0,
    dueAt: 0,
    interval: 0,
    ease: 2.3,
    reps: 0,
    lapses: 0,
    ...over,
  };
}

describe("applyReview", () => {
  it("schedules sooner after a miss", () => {
    const now = 1_000_000;
    const next = applyReview(base({ status: "learning", reps: 2, interval: 3 }), false, now);
    expect(next.lapses).toBe(1);
    expect(next.dueAt).toBeLessThan(now + 2 * 60 * 60 * 1000);
    expect(next.status).toBe("learning");
  });

  it("stretches interval after a hit", () => {
    const now = 1_000_000;
    const next = applyReview(base(), true, now);
    expect(next.reps).toBe(1);
    expect(next.interval).toBe(1);
    expect(isDue(next, now)).toBe(false);
  });
});
