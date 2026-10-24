import { useEffect, useMemo, useState, type FormEvent } from "react";
import { buildSeedEntries } from "../data/seedPack";
import { buildQuizOptions } from "../lib/quiz";
import { hashForScreen, screenFromHash } from "../lib/routing";
import { applyReview, isDue, sortByDue } from "../lib/srs";
import {
  catchWord,
  loadEntries,
  removeEntry,
  saveEntries,
  upsertEntry,
} from "../lib/store";
import type { Entry, Screen } from "../lib/types";

const NAV: readonly { id: Screen; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "catch", label: "Catch" },
  { id: "bank", label: "Bank" },
  { id: "cards", label: "Cards" },
  { id: "quiz", label: "Quiz" },
];

export function LexiConApp() {
  const [screen, setScreenState] = useState<Screen>(() =>
    typeof window !== "undefined" ? screenFromHash(window.location.hash) : "home",
  );
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState("");

  const setScreen = (next: Screen) => {
    setScreenState(next);
    const hash = hashForScreen(next);
    if (window.location.hash !== hash) {
      window.history.pushState(null, "", hash);
    }
  };

  useEffect(() => {
    setEntries(loadEntries());
    setHydrated(true);
    const onHash = () => setScreenState(screenFromHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveEntries(entries);
  }, [entries, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const dueCount = useMemo(() => entries.filter((e) => isDue(e)).length, [entries]);
  const persist = (next: Entry[]) => setEntries(next);

  const loadSeed = () => {
    if (entries.length > 0) {
      const ok = window.confirm("Replace your current Lex bank with the demo pack?");
      if (!ok) return;
    }
    persist(buildSeedEntries());
    setToast("Demo pack loaded — try Cards or Quiz.");
    setScreen("cards");
  };

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => setScreen("home")}>
          <span className="brand-kicker">Lex · NorthStar Vector</span>
          <span className="brand-name">LexiCon</span>
        </button>
        <nav className="nav" aria-label="Primary">
          {NAV.map(({ id, label }) => (
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

      <div key={screen} className="screen-enter">
        {screen === "home" && (
          <Home
            total={entries.length}
            due={dueCount}
            onGo={setScreen}
            onSeed={loadSeed}
          />
        )}
        {screen === "catch" && (
          <CatchScreen
            entries={entries}
            onSaved={(next, updated) => {
              persist(next);
              setToast(updated ? "Updated in Lex." : "Caught — saved to Lex.");
            }}
          />
        )}
        {screen === "bank" && (
          <BankScreen
            entries={entries}
            onRemove={(id) => {
              persist(removeEntry(id, entries));
              setToast("Removed from Lex.");
            }}
            onUpdate={(entry) => persist(upsertEntry(entry, entries))}
            onCatch={() => setScreen("catch")}
            onSeed={loadSeed}
          />
        )}
        {screen === "cards" && (
          <CardsScreen
            entries={entries}
            onUpdate={(entry) => persist(upsertEntry(entry, entries))}
            onCatch={() => setScreen("catch")}
            onSeed={loadSeed}
          />
        )}
        {screen === "quiz" && (
          <QuizScreen
            entries={entries}
            onUpdate={(entry) => persist(upsertEntry(entry, entries))}
            onCatch={() => setScreen("catch")}
            onSeed={loadSeed}
          />
        )}
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function Home({
  total,
  due,
  onGo,
  onSeed,
}: {
  total: number;
  due: number;
  onGo: (s: Screen) => void;
  onSeed: () => void;
}) {
  return (
    <>
      <section className="hero">
        <h1>
          Catch words
          <br />
          while you read.
        </h1>
        <p>
          Your bank. Your gloss. Flip cards and take short quizzes until the words stick —
          no streaks, no AI theater.
        </p>
      </section>

      {total === 0 && (
        <div className="seed-banner">
          <p>Empty Lex. Load 8 demo words and try the full loop in a minute.</p>
          <button type="button" className="btn btn-soft" onClick={onSeed}>
            Load demo pack
          </button>
        </div>
      )}

      <div className="grid-actions">
        <button type="button" className="action-card" onClick={() => onGo("catch")}>
          <span className="n">01</span>
          <strong>Catch</strong>
          <span>Save a word from the text you are reading.</span>
        </button>
        <button type="button" className="action-card" onClick={() => onGo("bank")}>
          <span className="n">02</span>
          <strong>Bank</strong>
          <span>Browse, search, and edit everything you kept.</span>
        </button>
        <button type="button" className="action-card" onClick={() => onGo("cards")}>
          <span className="n">03</span>
          <strong>Cards</strong>
          <span>Flip lemma ↔ gloss until it feels familiar.</span>
        </button>
        <button type="button" className="action-card" onClick={() => onGo("quiz")}>
          <span className="n">04</span>
          <strong>Quiz</strong>
          <span>Four options. One right answer.</span>
        </button>
      </div>
      <div className="stats">
        <span>
          In Lex: <b>{total}</b>
        </span>
        <span>
          Due now: <b>{due}</b>
        </span>
        {total > 0 && (
          <button type="button" className="btn btn-ghost" onClick={onSeed}>
            Reset demo pack
          </button>
        )}
      </div>
    </>
  );
}

function CatchScreen({
  entries,
  onSaved,
}: {
  entries: Entry[];
  onSaved: (next: Entry[], updated: boolean) => void;
}) {
  const [surface, setSurface] = useState("");
  const [gloss, setGloss] = useState("");
  const [context, setContext] = useState("");
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const { entries: next, updated } = catchWord({ surface, gloss, context }, entries);
      onSaved(next, updated);
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
      <p className="lead">Word + your gloss. Context sentence is optional — keep the line you found it in.</p>
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
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  );
}

function BankScreen({
  entries,
  onRemove,
  onUpdate,
  onCatch,
  onSeed,
}: {
  entries: Entry[];
  onRemove: (id: string) => void;
  onUpdate: (e: Entry) => void;
  onCatch: () => void;
  onSeed: () => void;
}) {
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGloss, setEditGloss] = useState("");
  const [editContext, setEditContext] = useState("");

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

  const startEdit = (e: Entry) => {
    setEditingId(e.id);
    setEditGloss(e.gloss);
    setEditContext(e.context);
  };

  const saveEdit = (e: Entry) => {
    onUpdate({ ...e, gloss: editGloss.trim() || e.gloss, context: editContext.trim() });
    setEditingId(null);
  };

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
              <button type="button" className="btn" onClick={onCatch}>
                Catch a word
              </button>
              <button type="button" className="btn btn-soft" onClick={onSeed}>
                Load demo pack
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
                {editingId === e.id ? (
                  <div style={{ marginTop: 10 }}>
                    <div className="field">
                      <label htmlFor={`g-${e.id}`}>Gloss</label>
                      <input
                        id={`g-${e.id}`}
                        value={editGloss}
                        onChange={(ev) => setEditGloss(ev.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`c-${e.id}`}>Context</label>
                      <textarea
                        id={`c-${e.id}`}
                        value={editContext}
                        onChange={(ev) => setEditContext(ev.target.value)}
                      />
                    </div>
                    <div className="row">
                      <button type="button" className="btn" onClick={() => saveEdit(e)}>
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="gloss">{e.gloss}</div>
                )}
              </div>
              <span
                className={`pill${e.status === "known" ? " pill-known" : e.status === "new" ? " pill-new" : ""}`}
              >
                {e.status}
              </span>
              {editingId !== e.id && e.context && <div className="meta">“{e.context}”</div>}
              {editingId !== e.id && (
                <div className="row" style={{ gridColumn: "1 / -1" }}>
                  <button type="button" className="btn btn-soft" onClick={() => startEdit(e)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => onRemove(e.id)}>
                    Remove
                  </button>
                </div>
              )}
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
  onSeed,
}: {
  entries: Entry[];
  onUpdate: (e: Entry) => void;
  onCatch: () => void;
  onSeed: () => void;
}) {
  const queue = useMemo(
    () => [...entries].filter((e) => isDue(e)).sort(sortByDue),
    [entries],
  );
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);

  const pool = useMemo(
    () => (queue.length > 0 ? queue : [...entries].sort(sortByDue)),
    [queue, entries],
  );
  const current = pool[Math.min(index, Math.max(pool.length - 1, 0))];

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
    setDone(0);
  }, [entries.length]);

  useEffect(() => {
    if (!current) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
      if (ev.key === " " || ev.key === "Enter") {
        ev.preventDefault();
        setFlipped((f) => !f);
      } else if (ev.key === "1" || ev.key === "ArrowLeft") {
        ev.preventDefault();
        grade(false);
      } else if (ev.key === "2" || ev.key === "ArrowRight") {
        ev.preventDefault();
        grade(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- grade closes over current
  }, [current, flipped, index, pool.length]);

  if (entries.length === 0) {
    return (
      <section className="panel">
        <h2>Cards</h2>
        <p className="lead">Nothing to flip yet.</p>
        <div className="row">
          <button type="button" className="btn" onClick={onCatch}>
            Catch a word
          </button>
          <button type="button" className="btn btn-soft" onClick={onSeed}>
            Load demo pack
          </button>
        </div>
      </section>
    );
  }

  if (!current) return null;

  function grade(correct: boolean) {
    onUpdate(applyReview(current!, correct));
    setFlipped(false);
    setDone((d) => d + 1);
    setIndex((i) => (i + 1) % pool.length);
  }

  return (
    <section className="panel">
      <h2>Cards</h2>
      <p className="progress">
        {queue.length > 0 ? `${queue.length} due` : "Reviewing bank"} · reviewed {done} ·{" "}
        {index + 1}/{pool.length}
      </p>
      <p className="hint">Space — flip · 1 — again · 2 — got it</p>
      <button
        type="button"
        className={`card-stage${flipped ? " is-back" : ""}`}
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
  onSeed,
}: {
  entries: Entry[];
  onUpdate: (e: Entry) => void;
  onCatch: () => void;
  onSeed: () => void;
}) {
  const queue = useMemo(
    () => [...entries].filter((e) => isDue(e)).sort(sortByDue),
    [entries],
  );
  const pool = queue.length > 0 ? queue : entries;
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ ok: 0, miss: 0 });

  const current = pool[Math.min(index, Math.max(pool.length - 1, 0))];
  const options = useMemo(
    () => (current ? buildQuizOptions(current, entries) : []),
    [current, entries],
  );

  useEffect(() => {
    setIndex(0);
    setPicked(null);
    setScore({ ok: 0, miss: 0 });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <section className="panel">
        <h2>Quiz</h2>
        <p className="lead">Need at least one word in Lex.</p>
        <div className="row">
          <button type="button" className="btn" onClick={onCatch}>
            Catch a word
          </button>
          <button type="button" className="btn btn-soft" onClick={onSeed}>
            Load demo pack
          </button>
        </div>
      </section>
    );
  }

  if (!current) return null;

  const correct = current.gloss.trim() || current.surface;

  const choose = (option: string) => {
    if (picked) return;
    setPicked(option);
    const ok = option === correct;
    setScore((s) => (ok ? { ...s, ok: s.ok + 1 } : { ...s, miss: s.miss + 1 }));
    window.setTimeout(() => {
      onUpdate(applyReview(current, ok));
      setPicked(null);
      setIndex((i) => (i + 1) % pool.length);
    }, 700);
  };

  return (
    <section className="panel">
      <h2>Quiz</h2>
      <p className="progress">
        What does this mean? · {index + 1}/{pool.length} · {score.ok} right · {score.miss} miss
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
