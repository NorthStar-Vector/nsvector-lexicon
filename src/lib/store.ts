import { normalizeLemma, newId } from "./normalize";
import type { Entry } from "./types";

const STORAGE_KEY = "lexicon.entries.v1";

export type CatchInput = {
  surface: string;
  gloss: string;
  context?: string;
};

function readRaw(): Entry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Entry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(entries: Entry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function loadEntries(): Entry[] {
  return readRaw().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveEntries(entries: Entry[]) {
  writeRaw(entries);
}

export function catchWord(input: CatchInput, existing: Entry[]): { entries: Entry[]; entry: Entry; updated: boolean } {
  const surface = input.surface.trim();
  const gloss = input.gloss.trim();
  const lemma = normalizeLemma(surface);
  if (!lemma || !gloss) {
    throw new Error("Word and gloss are required.");
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
