import { useEffect, useMemo, useState, type FormEvent } from "react";
import { buildSeedEntries } from "../data/seedPack";
import { STATUS_LABEL } from "../lib/labels";
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
  { id: "home", label: "Главная" },
  { id: "catch", label: "Поймать" },
  { id: "bank", label: "Банк" },
  { id: "cards", label: "Карточки" },
  { id: "quiz", label: "Тест" },
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
      const ok = window.confirm("Заменить текущий банк демо-набором?");
      if (!ok) return;
    }
    persist(buildSeedEntries());
    setToast("Демо загружено — открой Карточки или Тест.");
    setScreen("cards");
  };

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => setScreen("home")}>
          <span className="brand-kicker">Lex · NorthStar Vector</span>
          <span className="brand-name">LexiCon</span>
        </button>
        <nav className="nav" aria-label="Основное меню">
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
              setToast(updated ? "Обновлено в Lex." : "Поймано — сохранено в Lex.");
            }}
          />
        )}
        {screen === "bank" && (
          <BankScreen
            entries={entries}
            onRemove={(id) => {
              persist(removeEntry(id, entries));
              setToast("Удалено из Lex.");
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
          Лови слова,
          <br />
          пока читаешь.
        </h1>
        <p>
          Английское слово → свой перевод на русском. Карточки и короткий тест, пока не
          запомнится. Без серий и без AI-театра.
        </p>
      </section>

      {total === 0 && (
        <div className="seed-banner">
          <p>Lex пустой. Загрузи 8 демо-слов и пройди весь цикл за минуту.</p>
          <button type="button" className="btn btn-soft" onClick={onSeed}>
            Загрузить демо
          </button>
        </div>
      )}

      <div className="grid-actions">
        <button type="button" className="action-card" onClick={() => onGo("catch")}>
          <span className="n">01</span>
          <strong>Поймать</strong>
          <span>Сохрани слово из текста, который читаешь.</span>
        </button>
        <button type="button" className="action-card" onClick={() => onGo("bank")}>
          <span className="n">02</span>
          <strong>Банк</strong>
          <span>Список, поиск и правка всего, что оставил.</span>
        </button>
        <button type="button" className="action-card" onClick={() => onGo("cards")}>
          <span className="n">03</span>
          <strong>Карточки</strong>
          <span>Переворот: слово EN ↔ перевод RU.</span>
        </button>
        <button type="button" className="action-card" onClick={() => onGo("quiz")}>
          <span className="n">04</span>
          <strong>Тест</strong>
          <span>Четыре варианта. Один верный.</span>
        </button>
      </div>
      <div className="stats">
        <span>
          В Lex: <b>{total}</b>
        </span>
        <span>
          К повтору: <b>{due}</b>
        </span>
        {total > 0 && (
          <button type="button" className="btn btn-ghost" onClick={onSeed}>
            Сбросить на демо
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
      setError(err instanceof Error ? err.message : "Не удалось сохранить.");
    }
  };

  return (
    <section className="panel">
      <h2>Поймать</h2>
      <p className="lead">
        Английское слово + твой перевод на русском. Предложение-контекст — по желанию.
      </p>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="surface">Слово (EN)</label>
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
          <label htmlFor="gloss">Перевод / значение (RU)</label>
          <input
            id="gloss"
            value={gloss}
            onChange={(e) => setGloss(e.target.value)}
            placeholder="тлеющий уголёк"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="context">Предложение из текста</label>
          <textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="An ember glowed in the grate."
          />
        </div>
        <div className="row">
          <button type="submit" className="btn">
            Добавить в Lex
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

  const wordWord =
    entries.length === 1 ? "слово" : entries.length >= 2 && entries.length <= 4 ? "слова" : "слов";

  return (
    <section className="panel">
      <h2>Банк</h2>
      <p className="lead">
        {entries.length} {wordWord} в Lex.
      </p>
      <input
        className="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Поиск: слово, перевод, контекст…"
        aria-label="Поиск по банку"
      />
      {filtered.length === 0 ? (
        <div className="empty">
          {entries.length === 0 ? (
            <>
              <button type="button" className="btn" onClick={onCatch}>
                Поймать слово
              </button>
              <button type="button" className="btn btn-soft" onClick={onSeed}>
                Загрузить демо
              </button>
            </>
          ) : (
            "Ничего не найдено."
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
                      <label htmlFor={`g-${e.id}`}>Перевод (RU)</label>
                      <input
                        id={`g-${e.id}`}
                        value={editGloss}
                        onChange={(ev) => setEditGloss(ev.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`c-${e.id}`}>Контекст</label>
                      <textarea
                        id={`c-${e.id}`}
                        value={editContext}
                        onChange={(ev) => setEditContext(ev.target.value)}
                      />
                    </div>
                    <div className="row">
                      <button type="button" className="btn" onClick={() => saveEdit(e)}>
                        Сохранить
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Отмена
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
                {STATUS_LABEL[e.status]}
              </span>
              {editingId !== e.id && e.context && <div className="meta">“{e.context}”</div>}
              {editingId !== e.id && (
                <div className="row" style={{ gridColumn: "1 / -1" }}>
                  <button type="button" className="btn btn-soft" onClick={() => startEdit(e)}>
                    Изменить
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => onRemove(e.id)}>
                    Удалить
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
        <h2>Карточки</h2>
        <p className="lead">Пока нечего переворачивать.</p>
        <div className="row">
          <button type="button" className="btn" onClick={onCatch}>
            Поймать слово
          </button>
          <button type="button" className="btn btn-soft" onClick={onSeed}>
            Загрузить демо
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
      <h2>Карточки</h2>
      <p className="progress">
        {queue.length > 0 ? `${queue.length} к повтору` : "По банку"} · пройдено {done} ·{" "}
        {index + 1}/{pool.length}
      </p>
      <p className="hint">Пробел — переворот · 1 — снова · 2 — знаю</p>
      <button
        type="button"
        className={`card-stage${flipped ? " is-back" : ""}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Показать слово" : "Показать перевод"}
      >
        <span className="face-kicker">{flipped ? "Перевод (RU)" : "Слово (EN)"}</span>
        <span className="face-main">{flipped ? current.gloss : current.surface}</span>
        {flipped && current.context ? (
          <span className="face-sub">“{current.context}”</span>
        ) : (
          <span className="face-sub">Нажми, чтобы перевернуть</span>
        )}
      </button>
      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={() => grade(false)}>
          Снова
        </button>
        <button type="button" className="btn" onClick={() => grade(true)}>
          Знаю
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
        <h2>Тест</h2>
        <p className="lead">Нужно хотя бы одно слово в Lex.</p>
        <div className="row">
          <button type="button" className="btn" onClick={onCatch}>
            Поймать слово
          </button>
          <button type="button" className="btn btn-soft" onClick={onSeed}>
            Загрузить демо
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
      <h2>Тест</h2>
      <p className="progress">
        Что значит это слово? · {index + 1}/{pool.length} · верно {score.ok} · мимо {score.miss}
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
