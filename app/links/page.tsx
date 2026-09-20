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
import FilterBar from "@/components/FilterBar";

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
    setFilters((prev) => ({ ...prev, [key]: value, ...(key === "direction" && value !== prev.direction ? { category: "" } : {}) }));
  }

  function clearFilters() {
    setFilters({ direction: "", category: "", age: "", target_audience: "" });
  }

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <h1>Ссылки</h1>
      </header>

      <section className="chat-panel" aria-label="Фильтры и список ссылок">
        <FilterBar values={filters} facets={facets} ruLabel={ruLabel} onChange={setFilter} onClear={clearFilters} disabled={loading} />


        {error && <p className="message error" role="alert">{error}</p>}
        {loading && <p className="message">Загружаю...</p>}

        {!loading && !error && filtered.length === 0 && (
          <p className="message">Ничего не найдено по выбранным фильтрам.</p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="source-grid">
            {filtered.map((link) => {
              const src = metaStr(link, "source_url");
              const dir = ruLabel("direction", metaStr(link, "direction"));
              const cat = ruLabel("category", metaStr(link, "category"));
              const aud = ruLabel("target_audience", metaStr(link, "target_audience"));
              return (
                <article className="source-card" key={link.document_id}>
                  {dir && <span className="tag">{dir}</span>}
                  {cat && <p className="card-cat">{cat}</p>}
                  <h2>{src ? <a href={src} target="_blank" rel="noreferrer">{link.doc_name}</a> : link.doc_name}</h2>
                  <div className="card-foot">
                    <span>{aud}</span>
                    {src ? <span aria-hidden="true">↗</span> : <span className="no-link">Ссылка недоступна</span>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
