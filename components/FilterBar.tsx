// components/FilterBar.tsx
// Общий блок фильтров (ds_site#85, макет B): плашки "Тема" (direction),
// поле "Категория" с поиском, скрытая панель "Возраст"/"Аудитория" под
// кнопкой-пиктограммой, строка активных фильтров. Значения — из facets API.

"use client";

import { useEffect, useState } from "react";
import type { FilterKey } from "@/lib/gar";

export type FilterField = FilterKey;
export const FILTER_LABELS: Record<FilterField, string> = {
  direction: "Тема",
  category: "Категория",
  doc_type: "Тип статьи",
  age: "Возраст",
  target_audience: "Аудитория",
};
const ALL: FilterField[] = ["direction", "category", "doc_type", "age", "target_audience"];

type Props = {
  values: Partial<Record<FilterField, string>>;
  facets: Record<string, string[]>;
  ruLabel: (field: FilterKey, value: unknown) => string | null;
  onChange: (key: FilterField, value: string) => void;
  onClear: () => void;
  disabled?: boolean;
  /** Если задан — главное поле ищет по названию, а Тема/Категория уходят под ⚙. */
  titleQuery?: string;
  onTitleQuery?: (v: string) => void;
  /** direction -> [category]; категория зависит от направления. */
  tree?: Record<string, string[]>;
};

export default function FilterBar({ values, facets, ruLabel, onChange, onClear, disabled, titleQuery, onTitleQuery, tree }: Props) {
  const titleMode = onTitleQuery !== undefined;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(false);
  const lab = (k: FilterField, v: string) => ruLabel(k, v) ?? v;

  // Выбранное значение всегда должно быть в списке, даже если facets его не вернул.
  const withSel = (k: FilterField) => {
    const list = facets[k] ?? [];
    const val = values[k];
    return val && !list.includes(val) ? [val, ...list] : list;
  };
  const cats = withSel("category").filter((c) => lab("category", c).toLowerCase().includes(q.trim().toLowerCase()));
  const active = ALL.filter((k) => values[k]);
  const extra = (values.age ? 1 : 0) + (values.target_audience ? 1 : 0) + (values.doc_type ? 1 : 0)
    + (titleMode ? (values.direction ? 1 : 0) + (values.category ? 1 : 0) : 0);

  const [tq, setTq] = useState(titleQuery ?? "");
  useEffect(() => {
    if (!onTitleQuery || tq.trim() === (titleQuery ?? "")) return;
    const t = setTimeout(() => onTitleQuery(tq.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tq]);

  function pickCategory(c: string) {
    onChange("category", c);
    setQ("");
    setOpen(false);
  }

  function select(k: "direction" | "category") {
    let list = withSel(k);
    const dirVal = values.direction;
    if (k === "category" && dirVal && tree?.[dirVal]) {
      const allowed = tree[dirVal];
      const catVal = values.category;
      list = list.filter((c) => allowed.includes(c) || c === catVal);
    }
    return (
      <select
        className="fb-select"
        aria-label={FILTER_LABELS[k]}
        value={values[k] ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(k, e.target.value)}
      >
        <option value="">Все</option>
        {list.map((v) => <option key={v} value={v}>{lab(k, v)}</option>)}
      </select>
    );
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

  const catCombo = (
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
  );

  const gear = (
    <button type="button" className="fb-gear" aria-label="Фильтры" aria-expanded={panel} title="Фильтры" onClick={() => setPanel((p) => !p)}>
      <span aria-hidden="true">⚙</span>
      {extra > 0 && <b>{extra}</b>}
    </button>
  );

  const titleInput = (
    <div className="fb-combo">
      <div className="fb-in">
        <span aria-hidden="true">🔍</span>
        <input
          type="search"
          aria-label="Поиск по названию"
          placeholder="Поиск по названию…"
          autoComplete="off"
          value={tq}
          onChange={(e) => setTq(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <div className="fb" role="search" aria-label="Фильтры">
      {!titleMode && (<><p className="fb-lab">{FILTER_LABELS.direction}</p>{chips("direction")}</>)}

      <div className="fb-bar">
        {titleMode ? titleInput : catCombo}
        {gear}
      </div>

      {panel && (
        <div className="fb-panel">
          {titleMode && (
            <>
              <div><p className="fb-lab">{FILTER_LABELS.direction}</p>{select("direction")}</div>
              <div><p className="fb-lab">{FILTER_LABELS.category}</p>{select("category")}</div>
            </>
          )}
          {facets.doc_type && facets.doc_type.length > 1 && (
            <div><p className="fb-lab">{FILTER_LABELS.doc_type}</p>{chips("doc_type")}</div>
          )}
          <div><p className="fb-lab">{FILTER_LABELS.age}</p>{chips("age")}</div>
          <div><p className="fb-lab">{FILTER_LABELS.target_audience}</p>{chips("target_audience")}</div>
        </div>
      )}

      <div className="fb-active" aria-live="polite">
        {active.map((k) => (
          <button key={k} type="button" className="fb-chip act" onClick={() => onChange(k, "")}>
            {FILTER_LABELS[k]}: {lab(k, values[k] ?? "")} ✕
          </button>
        ))}
        {active.length > 0 && <button type="button" className="fb-link" onClick={onClear}>Сбросить всё</button>}
      </div>
    </div>
  );
}
