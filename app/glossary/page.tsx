// app/glossary/page.tsx
// Раздел "Глоссарий": документы doc_type=glossary_term|glossary_abb из GAR
// напрямую (ADR-0016, issue #77); определение подгружается при раскрытии.

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
const FILTER_ORDER = Object.keys(FILTER_LABELS) as Exclude<FilterKey, "doc_type">[];

const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";

function termFacetValue(term: DocumentSummary, key: Exclude<FilterKey, "doc_type">) {
  return metaStr(term, key);
}

function TermCard({ term, ruLabel }: { term: DocumentSummary; ruLabel: (k: FilterKey, v: unknown) => string | null }) {
  const [open, setOpen] = useState(false);
  const [definition, setDefinition] = useState<string | null>(null);
  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && definition === null) {
      try {
        const res = await fetch(`/api/gar/documents/${term.document_id}/content`);
        setDefinition(res.ok ? await res.text() : "");
      } catch {
        setDefinition("");
      }
    }
  }
  const dir = ruLabel("direction", metaStr(term, "direction"));
  const cat = ruLabel("category", metaStr(term, "category"));
  const kind = ruLabel("doc_type", metaStr(term, "doc_type"));
  return (
    <article className="source-card">
      {dir && <span className="tag">{dir}</span>}
      {cat && <p className="card-cat">{cat}</p>}
      <h2>{term.doc_name}</h2>
      {open && <p style={{ whiteSpace: "pre-line" }}>{definition === null ? "Загружаю..." : definition || "Определение недоступно."}</p>}
      <div className="card-foot">
        <span>{kind}</span>
        <button type="button" onClick={toggle} className="fb-link" aria-expanded={open}>
          {open ? "Скрыть определение" : "Показать определение"}
        </button>
      </div>
    </article>
  );
}

export default function GlossaryPage() {
  const { ruLabel } = useMetadataLabels(DATASET_ID);
  const [filters, setFilters] = useState<Record<Exclude<FilterKey, "doc_type">, string>>({
    direction: "", category: "", age: "", target_audience: "",
  });
  const [docType, setDocType] = useState(""); // "" = термины + сокращения
  const [terms, setTerms] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchAllDocuments(DATASET_ID, "glossary_term"),
      fetchAllDocuments(DATASET_ID, "glossary_abb"),
    ])
      .then(([a, b]) => {
        if (!cancelled) setTerms([...a, ...b]);
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

  const facets = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const key of FILTER_ORDER) {
      result[key] = [...new Set(terms.map((t) => termFacetValue(t, key)).filter((v): v is string => !!v))].sort();
    }
    return result;
  }, [terms]);

  const filtered = useMemo(() => {
    return terms
      .filter((t) => !docType || metaStr(t, "doc_type") === docType)
      .filter((t) => FILTER_ORDER.every((key) => !filters[key] || termFacetValue(t, key) === filters[key]))
      .sort((a, b) => a.doc_name.localeCompare(b.doc_name, "ru"));
  }, [terms, docType, filters]);

  function setFilter(key: Exclude<FilterKey, "doc_type">, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value, ...(key === "direction" && value !== prev.direction ? { category: "" } : {}) }));
  }

  function clearFilters() {
    setFilters({ direction: "", category: "", age: "", target_audience: "" });
    setDocType("");
  }

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <h1>Глоссарий</h1>
      </header>

      <section className="chat-panel" aria-label="Фильтры и список терминов">
        <div className="fb-chips" role="group" aria-label="Тип">
          {([["glossary_term", "Термины"], ["glossary_abb", "Сокращения"]] as const).map(([v, l]) => (
            <button key={v} type="button" className={`fb-chip${docType === v ? " on" : ""}`} aria-pressed={docType === v} disabled={loading} onClick={() => setDocType(docType === v ? "" : v)}>{l}</button>
          ))}
        </div>
        <FilterBar values={filters} facets={facets} ruLabel={ruLabel} onChange={setFilter} onClear={clearFilters} disabled={loading} />

        {error && <p className="message error" role="alert">{error}</p>}
        {loading && <p className="message">Загружаю...</p>}

        {!loading && !error && filtered.length === 0 && (
          <p className="message">Ничего не найдено по выбранным фильтрам.</p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="source-grid">
            {filtered.map((term) => (
              <TermCard key={term.document_id} term={term} ruLabel={ruLabel} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
