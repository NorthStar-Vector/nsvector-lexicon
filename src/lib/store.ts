import { deleteEntryById, listEntries, putEntry, replaceAllEntries } from "./db";
import { normalizeLemma, newId } from "./normalize";
import type { Entry } from "./types";

export type CatchInput = {
  surface: string;
  gloss: string;
  context?: string;
};

export type LexExport = {
  version: 1;
  product: "lexicon";
  exportedAt: number;
  entries: Entry[];
};

export async function loadEntries(): Promise<Entry[]> {
  return listEntries();
}

export async function saveEntries(entries: Entry[]): Promise<void> {
  await replaceAllEntries(entries);
}

export async function saveEntry(entry: Entry): Promise<void> {
  await putEntry(entry);
}

export async function deleteEntry(id: string): Promise<void> {
  await deleteEntryById(id);
}

export function catchWord(
  input: CatchInput,
  existing: Entry[],
): { entries: Entry[]; entry: Entry; updated: boolean } {
  const surface = input.surface.trim();
  const gloss = input.gloss.trim();
  const lemma = normalizeLemma(surface);
  if (!lemma || !gloss) {
    throw new Error("Нужны слово и перевод.");
  }

  const now = Date.now();
  const found = existing.find((e) => e.lemma === lemma);
  if (found) {
    const entry: Entry = {
      ...found,
      surface,
      gloss,
      context: (input.context ?? found.context).trim(),
    };
    const entries = existing.map((e) => (e.id === found.id ? entry : e));
    return { entries, entry, updated: true };
  }

  const entry: Entry = {
    id: newId(),
    lemma,
    surface,
    gloss,
    context: (input.context ?? "").trim(),
    status: "new",
    createdAt: now,
    dueAt: now,
    interval: 0,
    ease: 2.3,
    reps: 0,
    lapses: 0,
  };
  return { entries: [entry, ...existing], entry, updated: false };
}

export function removeEntry(id: string, existing: Entry[]): Entry[] {
  return existing.filter((e) => e.id !== id);
}

export function upsertEntry(entry: Entry, existing: Entry[]): Entry[] {
  const i = existing.findIndex((e) => e.id === entry.id);
  if (i < 0) return [entry, ...existing];
  const next = [...existing];
  next[i] = entry;
  return next;
}

export function buildExportPayload(entries: Entry[]): LexExport {
  return {
    version: 1,
    product: "lexicon",
    exportedAt: Date.now(),
    entries,
  };
}

export function parseImportPayload(raw: string): Entry[] {
  const data = JSON.parse(raw) as LexExport | Entry[];
  const list = Array.isArray(data) ? data : data.entries;
  if (!Array.isArray(list)) {
    throw new Error("Неверный формат файла.");
  }
  return list.filter(
    (e) =>
      e &&
      typeof e === "object" &&
      typeof (e as Entry).id === "string" &&
      typeof (e as Entry).lemma === "string" &&
      typeof (e as Entry).surface === "string" &&
      typeof (e as Entry).gloss === "string",
  ) as Entry[];
}

/** Merge import into bank by lemma (incoming wins on conflict). */
export function mergeByLemma(existing: Entry[], incoming: Entry[]): Entry[] {
  const map = new Map<string, Entry>();
  for (const e of existing) map.set(e.lemma, e);
  for (const e of incoming) {
    const prev = map.get(e.lemma);
    if (!prev) {
      map.set(e.lemma, e);
      continue;
    }
    map.set(e.lemma, {
      ...prev,
      ...e,
      id: prev.id,
      createdAt: Math.min(prev.createdAt, e.createdAt || prev.createdAt),
    });
  }
  return [...map.values()].sort((a, b) => b.createdAt - a.createdAt);
}
