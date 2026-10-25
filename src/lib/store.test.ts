import { describe, expect, it } from "vitest";
import { buildExportPayload, mergeByLemma, parseImportPayload } from "./store";
import type { Entry } from "./types";

function entry(over: Partial<Entry> & Pick<Entry, "id" | "lemma" | "gloss">): Entry {
  return {
    surface: over.lemma,
    context: "",
    status: "new",
    createdAt: 1,
    dueAt: 1,
    interval: 0,
    ease: 2.3,
    reps: 0,
    lapses: 0,
    ...over,
  };
}

describe("import/export", () => {
  it("round-trips export payload", () => {
    const list = [entry({ id: "1", lemma: "ember", gloss: "уголёк" })];
    const raw = JSON.stringify(buildExportPayload(list));
    expect(parseImportPayload(raw)).toHaveLength(1);
  });

  it("merges by lemma keeping stable id", () => {
    const existing = [entry({ id: "a", lemma: "ember", gloss: "старый", createdAt: 10 })];
    const incoming = [entry({ id: "b", lemma: "ember", gloss: "новый", createdAt: 99 })];
    const merged = mergeByLemma(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe("a");
    expect(merged[0]?.gloss).toBe("новый");
  });
});
