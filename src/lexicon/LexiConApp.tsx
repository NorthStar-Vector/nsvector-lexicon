import { useEffect, useMemo, useState, type FormEvent } from "react";
import { buildQuizOptions } from "../lib/quiz";
import { applyReview, isDue, sortByDue } from "../lib/srs";
import {
  catchWord,
  loadEntries,
  removeEntry,
  saveEntries,
  upsertEntry,
} from "../lib/store";
import type { Entry, Screen } from "../lib/types";

export function LexiConApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEntries(loadEntries());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveEntries(entries);
  }, [entries, hydrated]);

  const dueCount = useMemo(
    () => entries.filter((e) => isDue(e)).length,
    [entries],
  );

  const persist = (next: Entry[]) => setEntries(next);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-kicker">Lex · NorthStar Vector</span>
          <span className="brand-name">LexiCon</span>
        </div>
        <nav className="nav" aria-label="Primary">
          {(
            [
              ["home", "Home"],
              ["catch", "Catch"],
              ["bank", "Bank"],
              ["cards", "Cards"],
              ["quiz", "Quiz"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={screen === id ? "page" : undefined}
              onClick={() => setScreen(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {screen === "home" && (
        <Home
          total={entries.length}
          due={dueCount}
          onGo={setScreen}
        />
      )}
      {screen === "catch" && (
        <CatchScreen
          entries={entries}
          onSaved={(next) => {
            persist(next);
            setScreen("bank");
          }}
        />
      )}
      {screen === "bank" && (
        <BankScreen
          entries={entries}
          onRemove={(id) => persist(removeEntry(id, entries))}
          onCatch={() => setScreen("catch")}
        />
      )}
      {screen === "cards" && (
        <CardsScreen
          entries={entries}
          onUpdate={(entry) => persist(upsertEntry(entry, entries))}
          onCatch={() => setScreen("catch")}
        />
      )}
      {screen === "quiz" && (
        <QuizScreen
          entries={entries}
          onUpdate={(entry) => persist(upsertEntry(entry, entries))}
          onCatch={() => setScreen("catch")}
        />
      )}
    </div>
  );
}

function Home({
  total,
  due,
  onGo,
}: {
  total: number;
  due: number;
  onGo: (s: Screen) => void;
}) {
  return (
    <>
      <section className="hero">
        <h1>Catch words while you read.</h1>
        <p>Drill them until they stick — your bank, your gloss, no streaks.</p>
      </section>
      <div className="grid-actions">
        <button type="button" className="action-card" onClick={() => onGo("catch")}>
          <strong>Catch</strong>
          <span>Save a word from the text you are reading.</span>
        </button>
        <button type="button" className="action-card" onClick={() => onGo("bank")}>
          <strong>Bank</strong>
          <span>Browse and search everything you kept.</span>
        </button>
        <button type="button" className="action-card" onClick={() => onGo("cards")}>
          <strong>Cards</strong>
          <span>Flip lemma ↔ gloss until it feels familiar.</span>
        </button>
        <button type="button" className="action-card" onClick={() => onGo("quiz")}>
          <strong>Quiz</strong>
          <span>Four options. One right answer. Stay sharp.</span>
        </button>
      </div>
      <div className="stats">
        <span>
          In Lex: <b>{total}</b>
        </span>
        <span>
          Due now: <b>{due}</b>
        </span>
      </div>
    </>
  );
}

function CatchScreen({
  entries,
  onSaved,
}: {
  entries: Entry[];
  onSaved: (next: Entry[]) => void;
}) {
  const [surface, setSurface] = useState("");
  const [gloss, setGloss] = useState("");
  const [context, setContext] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      const { entries: next, updated } = catchWord({ surface, gloss, context }, entries);
      onSaved(next);
      setNotice(updated ? "Updated existing entry in Lex." : "Caught — saved to Lex.");
      setSurface("");
      setGloss("");
      setContext("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  };

  return (
    <section className="panel">
      <h2>Catch</h2>
      <p className="lead">Word + your gloss. Context sentence is optional.</p>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="surface">Word</label>
          <input
            id="surface"
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            placeholder="ember"
            autoComplete="off"
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="gloss">Your gloss / translation</label>
          <input
            id="gloss"
            value={gloss}
            onChange={(e) => setGloss(e.target.value)}
            placeholder="тлеющий уголёк"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="context">Context sentence</label>
          <textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="An ember glowed in the grate."
          />
        </div>
        <div className="row">
          <button type="submit" className="btn">
            Add to Lex
          </button>
        </div>
        {notice && <p className="notice">{notice}</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  );
}

function BankScreen({
  entries,
  onRemove,
  onCatch,
}: {
  entries: Entry[];
  onRemove: (id: string) => void;
  onCatch: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter(
      (e) =>
        e.lemma.includes(needle) ||
        e.surface.toLowerCase().includes(needle) ||
        e.gloss.toLowerCase().includes(needle) ||
        e.context.toLowerCase().includes(needle),
    );
  }, [entries, q]);

  return (
    <section className="panel">
      <h2>Bank</h2>
      <p className="lead">{entries.length} words in Lex.</p>
      <input
        className="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search lemma, gloss, context…"
        aria-label="Search bank"
      />
      {filtered.length === 0 ? (
        <div className="empty">
          {entries.length === 0 ? (
            <>
              Empty bank.{" "}
              <button type="button" className="btn btn-soft" onClick={onCatch}>
                Catch a word
              </button>
            </>
          ) : (
            "No matches."
          )}
        </div>
      ) : (
        <ul className="bank-list">
          {filtered.map((e) => (
            <li key={e.id} className="bank-item">
              <div>
                <div className="lemma">{e.surface}</div>
                <div className="gloss">{e.gloss}</div>
              </div>
              <span
                className={`pill${e.status === "known" ? " pill-known" : e.status === "new" ? " pill-new" : ""}`}
              >
                {e.status}
              </span>
              {e.context && <div className="meta">“{e.context}”</div>}
              <div className="row" style={{ gridColumn: "1 / -1" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => onRemove(e.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CardsScreen({
  entries,
  onUpdate,
  onCatch,
}: {
  entries: Entry[];
  onUpdate: (e: Entry) => void;
  onCatch: () => void;
}) {
  const queue = useMemo(
    () => [...entries].filter((e) => isDue(e)).sort(sortByDue),
    [entries],
  );
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <section className="panel">
        <h2>Cards</h2>
        <p className="lead">Nothing to flip yet.</p>
        <button type="button" className="btn" onClick={onCatch}>
          Catch a word
        </button>
      </section>
    );
  }

  const pool = queue.length > 0 ? queue : [...entries].sort(sortByDue);
  const current = pool[Math.min(index, pool.length - 1)];
  if (!current) return null;

  const grade = (correct: boolean) => {
    onUpdate(applyReview(current, correct));
    setFlipped(false);
    setIndex((i) => (i + 1) % pool.length);
  };

  return (
    <section className="panel">
      <h2>Cards</h2>
      <p className="progress">
        {queue.length > 0 ? `${queue.length} due` : "Reviewing bank"} · {index + 1}/
        {pool.length}
      </p>
      <button
        type="button"
        className="card-stage"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Show word" : "Show gloss"}
      >
        <span className="face-kicker">{flipped ? "Gloss" : "Word"}</span>
        <span className="face-main">{flipped ? current.gloss : current.surface}</span>
        {flipped && current.context ? (
          <span className="face-sub">“{current.context}”</span>
        ) : (
          <span className="face-sub">Tap to flip</span>
        )}
      </button>
      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={() => grade(false)}>
          Again
        </button>
        <button type="button" className="btn" onClick={() => grade(true)}>
          Got it
        </button>
      </div>
    </section>
  );
}

function QuizScreen({
  entries,
  onUpdate,
  onCatch,
}: {
  entries: Entry[];
  onUpdate: (e: Entry) => void;
  onCatch: () => void;
}) {
  const queue = useMemo(
    () => [...entries].filter((e) => isDue(e)).sort(sortByDue),
    [entries],
  );
  const pool = queue.length > 0 ? queue : entries;
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const current = pool[Math.min(index, Math.max(pool.length - 1, 0))];
  const options = useMemo(
    () => (current ? buildQuizOptions(current, entries) : []),
    [current, entries],
  );

  useEffect(() => {
    setIndex(0);
    setPicked(null);
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <section className="panel">
        <h2>Quiz</h2>
        <p className="lead">Need at least one word in Lex.</p>
        <button type="button" className="btn" onClick={onCatch}>
          Catch a word
        </button>
      </section>
    );
  }

  if (!current) return null;

  const correct = current.gloss.trim() || current.surface;

  const choose = (option: string) => {
    if (picked) return;
    setPicked(option);
    const ok = option === correct;
    window.setTimeout(() => {
      onUpdate(applyReview(current, ok));
      setPicked(null);
      setIndex((i) => (i + 1) % pool.length);
    }, 650);
  };

  return (
    <section className="panel">
      <h2>Quiz</h2>
      <p className="progress">
        What does this mean? · {index + 1}/{pool.length}
      </p>
      <p className="quiz-prompt">{current.surface}</p>
      {current.context && (
        <p className="lead" style={{ marginTop: 0 }}>
          “{current.context}”
        </p>
      )}
      <div className="quiz-options">
        {options.map((opt) => {
          let cls = "";
          if (picked) {
            if (opt === correct) cls = "is-correct";
            else if (opt === picked) cls = "is-wrong";
          }
          return (
            <button
              key={opt}
              type="button"
              className={cls}
              disabled={Boolean(picked)}
              onClick={() => choose(opt)}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </section>
  );
}
