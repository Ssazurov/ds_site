// components/DomainFilter.tsx — фильтр "Домен" (ADR-0020): мультивыбор с поиском,
// топ-N со счётчиками и выпадающий список с прокруткой; выбранные — чипами.
// Стили переиспользуют классы FilterBar (fb-*).

"use client";

import { useState } from "react";

export type DomainCount = { domain: string; count: number };
const TOP = 8;

type Props = {
  domains: DomainCount[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export default function DomainFilter({ domains, selected, onChange, disabled }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [az, setAz] = useState(false);

  const counts = new Map(domains.map((d) => [d.domain, d.count]));
  const toggle = (d: string) => onChange(selected.includes(d) ? selected.filter((x) => x !== d) : [...selected, d]);
  const needle = q.trim().toLowerCase();
  const list = domains
    .filter((d) => d.domain.includes(needle))
    .sort((a, b) => (az ? a.domain.localeCompare(b.domain) : 0));

  if (!domains.length && !selected.length) return null;

  return (
    <div className="fb-domain">
      <p className="fb-lab">Домен</p>
      <div className="fb-chips">
        {domains.slice(0, TOP).map(({ domain, count }) => (
          <button
            key={domain}
            type="button"
            className={`fb-chip${selected.includes(domain) ? " on" : ""}`}
            aria-pressed={selected.includes(domain)}
            disabled={disabled}
            onClick={() => toggle(domain)}
          >
            {domain} ({count})
          </button>
        ))}
      </div>
      {domains.length > TOP && (
        <div className="fb-combo">
          <div className="fb-in">
            <span aria-hidden="true">🔍</span>
            <input
              role="combobox"
              aria-expanded={open}
              aria-controls="fb-dom-list"
              aria-label="Домен"
              placeholder={`Все домены (${domains.length}): найти…`}
              autoComplete="off"
              value={q}
              disabled={disabled}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
            />
            <button type="button" className="fb-link" onMouseDown={(e) => { e.preventDefault(); setAz((v) => !v); }}>
              {az ? "по числу" : "А–Я"}
            </button>
          </div>
          {open && (
            <ul id="fb-dom-list" role="listbox" aria-multiselectable="true" className="fb-dd" style={{ maxHeight: "16rem", overflowY: "auto" }}>
              {list.length ? list.map(({ domain, count }) => (
                <li key={domain} role="option" aria-selected={selected.includes(domain)} onMouseDown={(e) => { e.preventDefault(); toggle(domain); }}>
                  {selected.includes(domain) ? "✓ " : ""}{domain} ({count})
                </li>
              )) : <li className="empty">Не найдено</li>}
            </ul>
          )}
        </div>
      )}
      {selected.length > 0 && (
        <div className="fb-active">
          {selected.map((d) => (
            <button key={d} type="button" className="fb-chip act" onClick={() => toggle(d)}>
              {d}{counts.has(d) ? "" : " (0)"} ✕
            </button>
          ))}
          <button type="button" className="fb-link" onClick={() => onChange([])}>Сбросить домены</button>
        </div>
      )}
    </div>
  );
}
