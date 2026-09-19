// app/links/page.tsx
// Раздел "Библиотека" -> "Ссылки": документы doc_type=link из GAR напрямую
// (ADR-0016, issue #77).
// Только внешние ресурсы (doc_type=link) — термины/сокращения глоссария
// живут отдельно на /glossary (ds_site#46).
// Карточка ресурса + структура страницы (без eyebrow/lede, фильтры + сброс) —
// по образцу /articles (ds_site#53). Поле "теги" в карточке не показывается:
// в метаданных документа такого поля нет — нужна отдельная задача с ADR
// на расширение контракта (ADR-0015, см. также ds_site#52).

"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAllDocuments, metaStr } from "@/lib/gar/documents-by-type";
import { useMetadataLabels } from "@/lib/gar/labels";
import type { DocumentSummary, FilterKey } from "@/lib/gar";

const FILTER_LABELS: Record<Exclude<FilterKey, "doc_type">, string> = {
  direction: "Направление",
  category: "Категория",
  age: "Возраст",
  target_audience: "Аудитория",
};

const OTHER_FILTERS = Object.keys(FILTER_LABELS) as Exclude<FilterKey, "doc_type">[];

const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";

function linkFacetValue(link: DocumentSummary, key: Exclude<FilterKey, "doc_type">) {
  return metaStr(link, key);
}

const clip = (t: string, n = 32) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

export default function LinksPage() {
  const { ruLabel } = useMetadataLabels(DATASET_ID);
  const [filters, setFilters] = useState<Record<Exclude<FilterKey, "doc_type">, string>>({
    direction: "", category: "", age: "", target_audience: "",
  });
  const [links, setLinks] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAllDocuments(DATASET_ID, "link")
      .then((docs) => {
        if (!cancelled) setLinks(docs);
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

  const facets = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const key of OTHER_FILTERS) {
      result[key] = [...new Set(links.map((l) => linkFacetValue(l, key)).filter((v): v is string => !!v))].sort();
    }
    return result;
  }, [links]);

  const filtered = useMemo(() => {
    return links.filter((l) => OTHER_FILTERS.every((key) => !filters[key] || linkFacetValue(l, key) === filters[key]));
  }, [links, filters]);

  function setFilter(key: Exclude<FilterKey, "doc_type">, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({ direction: "", category: "", age: "", target_audience: "" });
  }

  const hasActiveFilters = OTHER_FILTERS.some((key) => filters[key]);

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <h1>Ссылки</h1>
      </header>

      <section className="chat-panel" aria-label="Фильтры и список ссылок">
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1rem" }}>
          <fieldset className="response-mode" aria-label="Фильтры" disabled={loading} style={{ flex: 1 }}>
            {OTHER_FILTERS.map((key) => (
              <select
                key={key}
                value={filters[key]}
                onChange={(event) => setFilter(key, event.target.value)}
                aria-label={FILTER_LABELS[key]}
                title={filters[key] ? ruLabel(key, filters[key]) || undefined : undefined}
              >
                <option value="">{FILTER_LABELS[key]}: все</option>
                {(facets[key] || []).map((value) => (
                  <option key={value} value={value} title={ruLabel(key, value) ?? value}>{clip(ruLabel(key, value) ?? value)}</option>
                ))}
              </select>
            ))}
          </fieldset>
          <button type="button" onClick={clearFilters} disabled={loading || !hasActiveFilters}>Сбросить фильтры</button>
        </div>

        {error && <p className="message error" role="alert">{error}</p>}
        {loading && <p className="message">Загружаю...</p>}

        {!loading && !error && filtered.length === 0 && (
          <p className="message">Ничего не найдено по выбранным фильтрам.</p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="source-grid">
            {filtered.map((link) => (
              <article className="source-card" key={link.document_id}>
                <h2>{link.doc_name}</h2>
                <p>
                  {[ruLabel("direction", metaStr(link, "direction")), ruLabel("category", metaStr(link, "category")), ruLabel("target_audience", metaStr(link, "target_audience"))]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {metaStr(link, "source_url") ? (
                  <a href={metaStr(link, "source_url") ?? undefined} target="_blank" rel="noreferrer" className="source-link">
                    Перейти к ресурсу <span aria-hidden="true">↗</span>
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
