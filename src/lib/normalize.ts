/** Lowercase trim; strip simple punctuation at edges for lemma keys. */
export function normalizeLemma(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^[^a-z0-9а-яёіїєґ'-]+/iu, "")
    .replace(/[^a-z0-9а-яёіїєґ'-]+$/iu, "");
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `lex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
