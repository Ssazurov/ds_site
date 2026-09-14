// app/links/page.tsx
// Раздел "Библиотека" -> "Ссылки": список полезных ссылок/глоссария с теми же
// фильтрами, что и "Статьи" (ds_site#5, ADR-0003). Разблокировано ds_search#131
// (поэлементная загрузка glossary/links в GAR).

"use client";

import { useEffect, useState } from "react";
import type { DocumentSummary, DocumentsResponse, FilterKey } from "@/lib/gar";

const FILTER_LABELS: Record<FilterKey, string> = {
  direction: "Направление",
  category: "Категория",
  doc_type: "Тип материала",
  age: "Возраст",
  target_audience: "Аудитория",
};

const FILTER_ORDER: FilterKey[] = ["direction", "category", "doc_type", "age", "target_audience"];

const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";
// Раздел "Ссылки" показывает только эти doc_type (ds_search#131).
const LINKS_DOC_TYPES = ["link", "glossary_term", "glossary_abb"];

function linkTitle(doc: DocumentSummary) {
  return String(doc.metadata?.title || doc.doc_name);
}

function linkUrl(doc: DocumentSummary) {
  const url = doc.metadata?.original_url || doc.metadata?.canonical_md_url;
  return typeof url === "string" ? url : null;
}

async function fetchDocType(base: URLSearchParams, docType: string) {
  const params = new URLSearchParams(base);
  params.set("doc_type", docType);
  const res = await fetch(`/api/gar/documents?${params.toString()}`);
  return (await res.json()) as DocumentsResponse;
}

export default function LinksPage() {
  const [filters, setFilters] = useState<Record<Exclude<FilterKey, "doc_type">, string>>({
    direction: "", category: "", age: "", target_audience: "",
  });
  const [docType, setDocType] = useState(""); // "" = все 3 фиксированных типа
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [facets, setFacets] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!DATASET_ID) return;
    const base = new URLSearchParams({ dataset_id: DATASET_ID });
    if (filters.direction) base.set("direction", filters.direction);
    if (filters.category) base.set("category", filters.category);
    if (filters.age) base.set("age", filters.age);
    if (filters.target_audience) base.set("target_audience", filters.target_audience);

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const types = docType ? [docType] : LINKS_DOC_TYPES;
        const results = await Promise.all(types.map((t) => fetchDocType(base, t)));
        if (cancelled) return;
        for (const r of results) if (r.error) throw new Error(r.error);
        const merged = results.flatMap((r) => r.documents || []);
        setDocuments(merged);
        const mergedFacets = results.find((r) => r.facets)?.facets;
        if (mergedFacets) setFacets(mergedFacets);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить ссылки.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [filters.direction, filters.category, filters.age, filters.target_audience, docType]);

  function setFilter(key: Exclude<FilterKey, "doc_type">, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const otherFilters = FILTER_ORDER.filter((k) => k !== "doc_type") as Exclude<FilterKey, "doc_type">[];

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
          {otherFilters.map((key) => (
            <select
              key={key}
              value={filters[key]}
              onChange={(event) => setFilter(key, event.target.value)}
              aria-label={FILTER_LABELS[key]}
            >
              <option value="">{FILTER_LABELS[key]}: все</option>
              {(facets[key] || []).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          ))}
        </fieldset>

        {!DATASET_ID && <p className="message error" role="alert">Не настроен идентификатор набора данных.</p>}
        {error && <p className="message error" role="alert">{error}</p>}
        {loading && <p className="message">Загружаю...</p>}

        {!loading && !error && documents.length === 0 && (
          <p className="message">Ничего не найдено по выбранным фильтрам.</p>
        )}

        {!loading && documents.length > 0 && (
          <div className="source-grid">
            {documents.map((doc) => {
              const url = linkUrl(doc);
              return (
                <article className="source-card" key={doc.document_id}>
                  <h2>{linkTitle(doc)}</h2>
                  <p>
                    {[doc.metadata?.direction, doc.metadata?.category, doc.metadata?.doc_type]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer">
                      Открыть материал <span aria-hidden="true">↗</span>
                    </a>
                  ) : <span className="no-link">Ссылка недоступна</span>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
