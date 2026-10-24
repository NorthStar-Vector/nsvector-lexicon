# LexiCon

LexiCon helps you catch words while you read and drill them until they stick — a personal word bank, not a gamified course.

## Promise

**Catch words while you read. Drill them until they stick.**

Short UI voice: **Lex** (eyebrow, “Add to Lex”).

You are reading English (with or without a translation nearby). A word is worth keeping. You catch it into your bank, then flip cards and take short 4-option checks until it stays.

## Planned URL

`https://lex.nsvector.com` — DNS and public deploy are out of scope until separately tasked.

## Place in the constellation

- **Direction:** Focus · reading & attention  
- **Beside OneRead, not inside it:** OneRead finishes a read; LexiCon remembers a word. Separate repo, data, and auth.  
- **Not Word Cards AI / Practical English:** no shared code, store IDs, streaks, XP, or leaderboards.

## Core loop (V1)

1. **Catch** — enter a word; optional context sentence and your own translation/gloss.  
2. **Bank** — list, search, status (`new` → `learning` → `known`).  
3. **Cards** — flip lemma ↔ gloss.  
4. **Quiz** — lemma → 4 answers (1 correct + distractors from your bank when possible).

## Principles

- One job: keep words from reading.  
- Local-first by default.  
- User-authored gloss in V1 — no required dictionary or AI API.  
- Calm drills, never streaks or social pressure.  
- Honest status: in development until a dedicated public surface exists.

## V1 scope

- Local web desk (Vite + React + TypeScript).  
- Persist entries in the browser (`localStorage`).  
- Simple due scheduling (wrong → sooner; right → stretch interval).  
- Screens: Home → Catch → Bank → Cards | Quiz.

## Wave 2 (not V1)

- Sentence drag-and-drop from unknown words.  
- List import.  
- Optional sync / hybrid mode.  
- Light bridge: paste word + context from OneRead (no shared DB).  
- Product page on nsvector.com and public DNS.

## Non-goals

- Not a reader / RSVP tool (that is OneRead).  
- Not “download from any site.”  
- Not a Word Cards rebrand.  
- Not mandatory AI for every card.  
- Not production-public multi-tenant without a separate readiness review (local → private → public).
