// app/glossary/page.tsx
// Раздел "Глоссарий": термины и сокращения из pull-sync кэша
// (scripts/sync-glossary-links.mjs, ADR-0004 п.3, issue #8) — сайт больше
// не ходит в gar-core-api на каждый рендер за глоссарием.

"use client";

import { useEffect, useMemo, useState } from "react";
import type { GlossaryLinksCache, GlossaryTermRecord } from "@/lib/gar/glossary-links-cache";
import { useMetadataLabels } from "@/lib/gar/labels";
import type { FilterKey } from "@/lib/gar";

const FILTER_LABELS: Record<Exclude<FilterKey, "doc_type">, string> = {
  direction: "Направление",
  category: "Категория",
  age: "Возраст",
  target_audience: "Аудитория",
};
const FILTER_ORDER = Object.keys(FILTER_LABELS) as Exclude<FilterKey, "doc_type">[];

const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";

function termFacetValue(term: GlossaryTermRecord, key: Exclude<FilterKey, "doc_type">) {
  return key === "age" ? term.age_group : term[key];
}

function TermCard({ term, ruLabel }: { term: GlossaryTermRecord; ruLabel: (k: FilterKey, v: unknown) => string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="source-card">
      <h2>{term.term}</h2>
      <p>
        {[ruLabel("direction", term.direction), ruLabel("category", term.category), ruLabel("doc_type", term.doc_type)]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <button type="button" onClick={() => setOpen((v) => !v)} className="source-link">
        {open ? "Скрыть определение" : "Показать определение"}
      </button>
      {open && <p>{term.definition || "Определение недоступно."}</p>}
    </article>
  );
}

export default function GlossaryPage() {
  const { ruLabel } = useMetadataLabels(DATASET_ID);
  const [filters, setFilters] = useState<Record<Exclude<FilterKey, "doc_type">, string>>({
    direction: "", category: "", age: "", target_audience: "",
  });
  const [docType, setDocType] = useState(""); // "" = термины + сокращения
  const [cache, setCache] = useState<GlossaryLinksCache | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/glossary-links")
      .then((res) => res.json())
      .then((data: GlossaryLinksCache) => {
        if (!cancelled) setCache(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить глоссарий.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const terms = useMemo(() => cache?.terms.filter((t) => t.status === "active") ?? [], [cache]);

  const facets = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const key of FILTER_ORDER) {
      result[key] = [...new Set(terms.map((t) => termFacetValue(t, key)).filter((v): v is string => !!v))].sort();
    }
    return result;
  }, [terms]);

  const filtered = useMemo(() => {
    return terms
      .filter((t) => !docType || t.doc_type === docType)
      .filter((t) => FILTER_ORDER.every((key) => !filters[key] || termFacetValue(t, key) === filters[key]))
      .sort((a, b) => a.term.localeCompare(b.term, "ru"));
  }, [terms, docType, filters]);

  function setFilter(key: Exclude<FilterKey, "doc_type">, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <h1>Глоссарий</h1>
      </header>

      <section className="chat-panel" aria-label="Фильтры и список терминов">
        <fieldset className="response-mode" disabled={loading}>
          <legend>Фильтры</legend>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} aria-label="Тип">
            <option value="">Тип: все</option>
            <option value="glossary_term">Термин</option>
            <option value="glossary_abb">Сокращение</option>
          </select>
          {FILTER_ORDER.map((key) => (
            <select
              key={key}
              value={filters[key]}
              onChange={(event) => setFilter(key, event.target.value)}
              aria-label={FILTER_LABELS[key]}
              title={filters[key] ? ruLabel(key, filters[key]) || undefined : undefined}
            >
              <option value="">{FILTER_LABELS[key]}: все</option>
              {(facets[key] || []).map((value) => (
                <option key={value} value={value}>{ruLabel(key, value)}</option>
              ))}
            </select>
          ))}
        </fieldset>

        {error && <p className="message error" role="alert">{error}</p>}
        {loading && <p className="message">Загружаю...</p>}

        {!loading && !error && cache && !cache.syncedAt && (
          <p className="message">Синк ещё не запускался — данных пока нет.</p>
        )}

        {!loading && !error && cache?.syncedAt && filtered.length === 0 && (
          <p className="message">Ничего не найдено по выбранным фильтрам.</p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="source-grid">
            {filtered.map((term) => (
              <TermCard key={term.id} term={term} ruLabel={ruLabel} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
