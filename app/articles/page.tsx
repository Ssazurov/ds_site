// app/articles/page.tsx
// Раздел "Библиотека" -> "Статьи": список материалов с фильтрами по
// direction/category/doc_type/age/target_audience поверх схемы метаданных
// ds_search (issue ds_site#4, ADR-0003).

"use client";

import { useEffect, useState } from "react";

type DocumentSummary = {
  document_id: string;
  doc_name: string;
  metadata?: Record<string, unknown>;
};

type DocumentsResponse = {
  documents?: DocumentSummary[];
  total?: number;
  facets?: Record<string, string[]>;
  error?: string;
};

type FilterKey = "direction" | "category" | "doc_type" | "age" | "target_audience";

const FILTER_LABELS: Record<FilterKey, string> = {
  direction: "Направление",
  category: "Категория",
  doc_type: "Тип материала",
  age: "Возраст",
  target_audience: "Аудитория",
};

const FILTER_ORDER: FilterKey[] = ["direction", "category", "doc_type", "age", "target_audience"];

const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";

function articleTitle(doc: DocumentSummary) {
  return String(doc.metadata?.title || doc.doc_name);
}

function articleUrl(doc: DocumentSummary) {
  // ds_ingestion пишет ключ "source_url" (adapter/pipeline.py:_METADATA_KEYS);
  // original_url/canonical_md_url — из чата (schemas/chat.py), в карточке
  // документа их не бывает. Баг: карточки показывали "Ссылка недоступна",
  // хотя source_url был в metadata. Порядок — на случай будущих источников.
  const url = doc.metadata?.source_url || doc.metadata?.original_url || doc.metadata?.canonical_md_url;
  return typeof url === "string" ? url : null;
}

// value -> русская подпись для select-полей (issue TODO: заменить на публичный
// словарь из gar-core-api metadata-fields, когда появится /public/metadata-fields).
const DIRECTION_LABELS: Record<string, string> = {
  "podderzhka-semi": "Поддержка семьи",
  "soobschestva-i-vzaimopomosch": "Сообщества и взаимопомощь",
};

function ruLabel(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  return DIRECTION_LABELS[value] || value;
}

export default function ArticlesPage() {
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    direction: "", category: "", doc_type: "", age: "", target_audience: "",
  });
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [facets, setFacets] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!DATASET_ID) return;
    const params = new URLSearchParams({ dataset_id: DATASET_ID });
    for (const key of FILTER_ORDER) {
      if (filters[key]) params.set(key, filters[key]);
    }
    let cancelled = false;
    async function load() {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/gar/documents?${params.toString()}`);
        const data = (await res.json()) as DocumentsResponse;
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setDocuments(data.documents || []);
        setFacets((prev) => (data.facets ? data.facets : prev));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить статьи.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.direction, filters.category, filters.doc_type, filters.age, filters.target_audience]);

  function setFilter(key: FilterKey, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <p className="eyebrow">Библиотека</p>
        <h1>Статьи</h1>
        <p className="lede">Материалы базы знаний с фильтрами по направлению, категории, типу, возрасту и аудитории.</p>
      </header>

      <section className="chat-panel" aria-label="Фильтры и список статей">
        <fieldset className="response-mode" disabled={loading}>
          <legend>Фильтры</legend>
          {FILTER_ORDER.map((key) => (
            <select
              key={key}
              value={filters[key]}
              onChange={(event) => setFilter(key, event.target.value)}
              aria-label={FILTER_LABELS[key]}
            >
              <option value="">{FILTER_LABELS[key]}: все</option>
              {(facets[key] || []).map((value) => (
                <option key={value} value={value}>{ruLabel(value)}</option>
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
              const url = articleUrl(doc);
              return (
                <article className="source-card" key={doc.document_id}>
                  <h2>{articleTitle(doc)}</h2>
                  <p>
                    {[ruLabel(doc.metadata?.direction), ruLabel(doc.metadata?.category), ruLabel(doc.metadata?.doc_type)]
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
