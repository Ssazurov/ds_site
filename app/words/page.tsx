// app/words/page.tsx
// Каталог слов/карточек (ds_site#27, ADR-0027): фильтры по теме/возрасту,
// выбор карточек и переход на печать набора (/words/print).
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WordsFilterBar from "@/components/WordsFilterBar";
import WordCard from "@/components/WordCard";
import { filterWords, loadWords, type Word, type Category } from "@/lib/words";

function WordsContent() {
  const [words, setWords] = useState<Word[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [onlyWithImage, setOnlyWithImage] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadWords().then((d) => { setWords(d.words); setCategories(d.categories); }).catch((e) => setError(String(e.message ?? e)));
  }, []);

  const list = useMemo(
    () => (words ? filterWords(words, { category: category || undefined, age: age ?? undefined, onlyWithImage }) : []),
    [words, category, age, onlyWithImage],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <p className="eyebrow">Слова</p>
        <h1>Каталог карточек</h1>
        <p className="lede">Слова с картинками по темам и возрасту. Выберите карточки и распечатайте набор для занятий.</p>
      </header>

      {error && <p className="message error">{error}</p>}
      {!words && !error && <p className="message hint">Загружаю каталог…</p>}

      {words && (
        <>
          <WordsFilterBar
            categories={categories}
            category={category}
            age={age}
            onlyWithImage={onlyWithImage}
            onCategory={setCategory}
            onAge={setAge}
            onOnlyWithImage={setOnlyWithImage}
          />
          <p className="fb-total">Найдено: {list.length}</p>

          <div className="source-grid words-grid">
            {list.map((w) => <WordCard key={w.id} word={w} selected={selected.has(w.id)} onToggle={toggle} />)}
          </div>

          {selected.size > 0 && (
            <div className="selection-bar">
              <span>Выбрано карточек: {selected.size}</span>
              <div className="selection-bar-actions">
                <button type="button" onClick={() => setSelected(new Set())}>Сбросить</button>
                <Link href={`/words/print?ids=${[...selected].join(",")}`}>
                  <button type="button">Печать →</button>
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default function WordsPage() {
  return (
    <Suspense fallback={<div className="chat-shell"><p className="message">Загружаю...</p></div>}>
      <WordsContent />
    </Suspense>
  );
}
