import { describe, expect, it } from "vitest";
import { buildQuizOptions } from "./quiz";
import type { Entry } from "./types";

function entry(id: string, gloss: string): Entry {
  return {
    id,
    lemma: id,
    surface: id,
    gloss,
    context: "",
    status: "new",
    createdAt: 0,
    dueAt: 0,
    interval: 0,
    ease: 2.3,
    reps: 0,
    lapses: 0,
  };
}

describe("buildQuizOptions", () => {
  it("returns four options including the correct gloss", () => {
    const target = entry("ember", "glowing coal");
    const bank = [
      target,
      entry("a", "quiet pause"),
      entry("b", "to move carefully"),
      entry("c", "something unexpected"),
    ];
    const options = buildQuizOptions(target, bank);
    expect(options).toHaveLength(4);
    expect(options).toContain("glowing coal");
    expect(new Set(options).size).toBe(4);
  });
});
