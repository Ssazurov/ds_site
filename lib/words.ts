// lib/words.ts
// Каталог слов/карточек (ds_site#27, ADR-0027): данные из public/words/data.json
// (готовит scripts/export-words.mjs из ds_words, ds_words#1).
export type Word = {
  id: string;
  lemma: string;
  pos: string;
  category: string;
  categoryLabel: string;
  age: [number, number];
  prio: number;
  image: string | null;
};

export type Category = { id: string; label: string };

type WordsData = {
  generated_at: string;
  count: number;
  with_image: number;
  categories: Category[];
  words: Word[];
};

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

let cache: Promise<WordsData> | null = null;
export function loadWords(): Promise<WordsData> {
  if (!cache) {
    cache = fetch(`${BASE}/words/data.json`).then((r) => {
      if (!r.ok) throw new Error(`Каталог слов недоступен (HTTP ${r.status})`);
      return r.json();
    });
    cache.catch(() => { cache = null; });
  }
  return cache;
}

export function imageSrc(w: Pick<Word, "image">): string | null {
  return w.image ? `${BASE}${w.image}` : null;
}

export function filterWords(words: Word[], opts: { category?: string; age?: number; onlyWithImage?: boolean }): Word[] {
  return words.filter((w) => {
    if (opts.category && w.category !== opts.category) return false;
    if (opts.age != null && (opts.age < w.age[0] || opts.age > w.age[1])) return false;
    if (opts.onlyWithImage && !w.image) return false;
    return true;
  });
}
