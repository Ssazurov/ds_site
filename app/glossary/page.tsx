// app/glossary/page.tsx
// Раздел "Глоссарий": термины и сокращения (doc_type=glossary_term/
// glossary_abb, ds_search#131), с теми же фильтрами direction/category/
// age/target_audience, что и "Ссылки" (ds_site#16, эпик #14).
// Определение подгружается лениво по клику через
// /api/gar/documents/{id}/content (canonical_md, ADR-0006).

"use client";

import { useEffect, useState } from "react";
import type { DocumentSummary, DocumentsResponse, FilterKey } from "@/lib/gar";
import { useMetadataLabels } from "@/lib/gar/labels";

const FILTER_LABELS: Record<Exclude<FilterKey, "doc_type">, string> = {
  direction: "Направление",
  category: "Категория",
  age: "Возраст",
  target_audience: "Аудитория",
};
const FILTER_ORDER = Object.keys(FILTER_LABELS) as Exclude<FilterKey, "doc_type">[];

const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";
const GLOSSARY_DOC_TYPES = ["glossary_term", "glossary_abb"];

function termTitle(doc: DocumentSummary) {
  return String(doc.metadata?.title || doc.doc_name);
}

async function fetchDocType(base: URLSearchParams, docType: string) {
  const params = new URLSearchParams(base);
  params.set("doc_type", docType);
  const res = await fetch(`/api/gar/documents?${params.toString()}`);
  return (await res.json()) as DocumentsResponse;
}

function TermCard({ doc, ruLabel }: { doc: DocumentSummary; ruLabel: (k: FilterKey, v: unknown) => string | null }) {
  const [open, setOpen] = useState(false);
  const [definition, setDefinition] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (definition !== null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/gar/documents/${doc.document_id}/content`);
      if (!res.ok) {
        setDefinition("Определение недоступно.");
        return;
      }
      const text = await res.text();
      // content_path — markdown "# Термин\n\nОпределение\n" (см.
      // export_glossary_links_items.py) — убираем заголовок.
      setDefinition(text.replace(/^#.*\n+/, "").trim() || "Определение недоступно.");
    } catch {
      setDefinition("Определение недоступно.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="source-card">
      <h2>{termTitle(doc)}</h2>
      <p>
        {[ruLabel("direction", doc.metadata?.direction), ruLabel("category", doc.metadata?.category), ruLabel("doc_type", doc.metadata?.doc_type)]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <button type="button" onClick={toggle} className="source-link">
        {open ? "Скрыть определение" : "Показать определение"}
      </button>
      {open && <p>{loading ? "Загружаю..." : definition}</p>}
    </article>
  );
}

export default function GlossaryPage() {
  const { ruLabel } = useMetadataLabels(DATASET_ID);
  const [filters, setFilters] = useState<Record<Exclude<FilterKey, "doc_type">, string>>({
    direction: "", category: "", age: "", target_audience: "",
  });
  const [docType, setDocType] = useState(""); // "" = термины + сокращения
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
        const types = docType ? [docType] : GLOSSARY_DOC_TYPES;
        const results = await Promise.all(types.map((t) => fetchDocType(base, t)));
        if (cancelled) return;
        for (const r of results) if (r.error) throw new Error(r.error);
        const merged = results.flatMap((r) => r.documents || []);
        merged.sort((a, b) => termTitle(a).localeCompare(termTitle(b), "ru"));
        setDocuments(merged);
        const mergedFacets = results.find((r) => r.facets)?.facets;
        if (mergedFacets) setFacets(mergedFacets);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить глоссарий.");
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

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <p className="eyebrow">Библиотека</p>
        <h1>Глоссарий</h1>
        <p className="lede">Термины и сокращения по теме синдрома Дауна с фильтрами.</p>
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
            >
              <option value="">{FILTER_LABELS[key]}: все</option>
              {(facets[key] || []).map((value) => (
                <option key={value} value={value}>{ruLabel(key, value)}</option>
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
            {documents.map((doc) => (
              <TermCard key={doc.document_id} doc={doc} ruLabel={ruLabel} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
