// app/links/page.tsx
// Раздел "Библиотека" -> "Ссылки": из pull-sync кэша (scripts/sync-glossary-links.mjs,
// ADR-0004 п.3, issue #8) вместо live-запросов к gar-core-api.

"use client";

import { useEffect, useMemo, useState } from "react";
import type { GlossaryLinksCache, ResourceLinkRecord } from "@/lib/gar/glossary-links-cache";
import { useMetadataLabels } from "@/lib/gar/labels";
import type { FilterKey } from "@/lib/gar";

const FILTER_LABELS: Record<FilterKey, string> = {
  direction: "Направление",
  category: "Категория",
  doc_type: "Тип материала",
  age: "Возраст",
  target_audience: "Аудитория",
};

const FILTER_ORDER: FilterKey[] = ["direction", "category", "doc_type", "age", "target_audience"];
const OTHER_FILTERS = FILTER_ORDER.filter((k) => k !== "doc_type") as Exclude<FilterKey, "doc_type">[];

const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";

function linkFacetValue(link: ResourceLinkRecord, key: Exclude<FilterKey, "doc_type">) {
  return key === "age" ? link.age_group : link[key];
}

export default function LinksPage() {
  const { ruLabel } = useMetadataLabels(DATASET_ID);
  const [filters, setFilters] = useState<Record<Exclude<FilterKey, "doc_type">, string>>({
    direction: "", category: "", age: "", target_audience: "",
  });
  const [docType, setDocType] = useState("");
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
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить ссылки.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const links = useMemo(() => cache?.links.filter((l) => l.status === "active") ?? [], [cache]);

  const facets = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const key of OTHER_FILTERS) {
      result[key] = [...new Set(links.map((l) => linkFacetValue(l, key)).filter((v): v is string => !!v))].sort();
    }
    return result;
  }, [links]);

  const filtered = useMemo(() => {
    return links
      .filter((l) => !docType || l.doc_type === docType)
      .filter((l) => OTHER_FILTERS.every((key) => !filters[key] || linkFacetValue(l, key) === filters[key]));
  }, [links, docType, filters]);

  function setFilter(key: Exclude<FilterKey, "doc_type">, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <p className="eyebrow">Библиотека</p>
        <h1>Ссылки</h1>
        <p className="lede">Полезные ссылки и глоссарий с фильтрами по направлению, категории, типу, возрасту и аудитории.</p>
      </header>

      <section className="chat-panel" aria-label="Фильтры и список ссылок">
        <fieldset className="response-mode" disabled={loading}>
          <legend>Фильтры</legend>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} aria-label={FILTER_LABELS.doc_type}>
            <option value="">{FILTER_LABELS.doc_type}: все</option>
            <option value="link">Ссылка</option>
            <option value="glossary_term">Термин глоссария</option>
            <option value="glossary_abb">Сокращение</option>
          </select>
          {OTHER_FILTERS.map((key) => (
            <select
              key={key}
              value={filters[key]}
              onChange={(event) => setFilter(key, event.target.value)}
              aria-label={FILTER_LABELS[key]}
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
            {filtered.map((link) => (
              <article className="source-card" key={link.id}>
                <h2>{link.name}</h2>
                <p>
                  {[ruLabel("direction", link.direction), ruLabel("category", link.category), ruLabel("doc_type", link.doc_type)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {link.url ? (
                  <a href={link.url} target="_blank" rel="noreferrer">
                    Открыть материал <span aria-hidden="true">↗</span>
                  </a>
                ) : <span className="no-link">Ссылка недоступна</span>}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
