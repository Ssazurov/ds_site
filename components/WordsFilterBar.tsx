// components/WordsFilterBar.tsx
// Фильтры каталога слов (ds_site#27): тема (чипы) + возраст (возраст ребёнка,
// показываем слова с диапазоном age, включающим это значение) + только с картинкой.
"use client";

import type { Category } from "@/lib/words";

type Props = {
  categories: Category[];
  category: string;
  age: number | null;
  onlyWithImage: boolean;
  onCategory: (v: string) => void;
  onAge: (v: number | null) => void;
  onOnlyWithImage: (v: boolean) => void;
};

const AGES = [1, 2, 3, 4, 5, 6, 7];

export default function WordsFilterBar({ categories, category, age, onlyWithImage, onCategory, onAge, onOnlyWithImage }: Props) {
  return (
    <div className="fb" role="search" aria-label="Фильтры каталога слов">
      <p className="fb-lab">Тема</p>
      <div className="fb-chips">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`fb-chip${category === c.id ? " on" : ""}`}
            aria-pressed={category === c.id}
            onClick={() => onCategory(category === c.id ? "" : c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="fb-sort">
        <label>
          <span className="fb-lab">Возраст</span>
          <select className="fb-select" value={age ?? ""} onChange={(e) => onAge(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Все</option>
            {AGES.map((a) => <option key={a} value={a}>{a} года/лет</option>)}
          </select>
        </label>
        <label className="fb-scope">
          <input type="checkbox" checked={onlyWithImage} onChange={(e) => onOnlyWithImage(e.target.checked)} />
          Только с картинкой
        </label>
      </div>

      {(category || age != null) && (
        <div className="fb-active">
          {category && <button type="button" className="fb-chip act" onClick={() => onCategory("")}>Тема ✕</button>}
          {age != null && <button type="button" className="fb-chip act" onClick={() => onAge(null)}>Возраст: {age} ✕</button>}
        </div>
      )}
    </div>
  );
}
