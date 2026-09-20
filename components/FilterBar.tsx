// components/FilterBar.tsx
// Общий блок фильтров (ds_site#85, макет B): плашки "Тема" (direction),
// поле "Категория" с поиском, скрытая панель "Возраст"/"Аудитория" под
// кнопкой-пиктограммой, строка активных фильтров. Значения — из facets API.

"use client";

import { useState } from "react";
import type { FilterKey } from "@/lib/gar";

export type FilterField = Exclude<FilterKey, "doc_type">;
export const FILTER_LABELS: Record<FilterField, string> = {
  direction: "Тема",
  category: "Категория",
  age: "Возраст",
  target_audience: "Аудитория",
};
const ALL: FilterField[] = ["direction", "category", "age", "target_audience"];

type Props = {
  values: Record<FilterField, string>;
  facets: Record<string, string[]>;
  ruLabel: (field: FilterKey, value: unknown) => string | null;
  onChange: (key: FilterField, value: string) => void;
  onClear: () => void;
  disabled?: boolean;
};

export default function FilterBar({ values, facets, ruLabel, onChange, onClear, disabled }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(false);
  const lab = (k: FilterField, v: string) => ruLabel(k, v) ?? v;

  // Выбранное значение всегда должно быть в списке, даже если facets его не вернул.
  const withSel = (k: FilterField) => {
    const list = facets[k] ?? [];
    return values[k] && !list.includes(values[k]) ? [values[k], ...list] : list;
  };
  const cats = withSel("category").filter((c) => lab("category", c).toLowerCase().includes(q.trim().toLowerCase()));
  const active = ALL.filter((k) => values[k]);
  const extra = (values.age ? 1 : 0) + (values.target_audience ? 1 : 0);

  function pickCategory(c: string) {
    onChange("category", c);
    setQ("");
    setOpen(false);
  }

  function chips(k: FilterField) {
    return (
      <div className="fb-chips">
        {withSel(k).map((v) => (
          <button
            key={v}
            type="button"
            className={`fb-chip${values[k] === v ? " on" : ""}`}
            aria-pressed={values[k] === v}
            disabled={disabled}
            onClick={() => onChange(k, values[k] === v ? "" : v)}
          >
            {lab(k, v)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="fb" role="search" aria-label="Фильтры">
      <p className="fb-lab">{FILTER_LABELS.direction}</p>
      {chips("direction")}

      <div className="fb-bar">
        <div className="fb-combo">
          <div className="fb-in">
            <span aria-hidden="true">🔍</span>
            <input
              role="combobox"
              aria-expanded={open}
              aria-controls="fb-cat-list"
              aria-label={FILTER_LABELS.category}
              placeholder="Категория: найти по названию…"
              autoComplete="off"
              value={q}
              disabled={disabled}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter" && cats[0]) { e.preventDefault(); pickCategory(cats[0]); }
              }}
            />
          </div>
          {open && (
            <ul id="fb-cat-list" role="listbox" className="fb-dd">
              {cats.length ? cats.map((c) => (
                <li key={c} role="option" aria-selected={values.category === c} onMouseDown={(e) => { e.preventDefault(); pickCategory(c); }}>
                  {lab("category", c)}
                </li>
              )) : <li className="empty">Не найдено</li>}
            </ul>
          )}
        </div>
        <button type="button" className="fb-gear" aria-label="Фильтры: возраст и аудитория" aria-expanded={panel} title="Фильтры" onClick={() => setPanel((p) => !p)}>
          <span aria-hidden="true">⚙</span>
          {extra > 0 && <b>{extra}</b>}
        </button>
      </div>

      {panel && (
        <div className="fb-panel">
          <div><p className="fb-lab">{FILTER_LABELS.age}</p>{chips("age")}</div>
          <div><p className="fb-lab">{FILTER_LABELS.target_audience}</p>{chips("target_audience")}</div>
        </div>
      )}

      <div className="fb-active" aria-live="polite">
        {active.map((k) => (
          <button key={k} type="button" className="fb-chip act" onClick={() => onChange(k, "")}>
            {FILTER_LABELS[k]}: {lab(k, values[k])} ✕
          </button>
        ))}
        {active.length > 0 && <button type="button" className="fb-link" onClick={onClear}>Сбросить всё</button>}
      </div>
    </div>
  );
}
