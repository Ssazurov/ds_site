// app/articles/page.tsx
// Раздел "Библиотека" -> "Статьи": список материалов с фильтрами по
// direction/category/doc_type/age/target_audience поверх схемы метаданных
// ds_search (issue ds_site#4, ADR-0003).

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Issue #6: групповой выбор статей галочками -> scope для GAR-чата поверх
// существующего scope-tree (issue #32/#35), см. ADR-0003 п.1 и filters.document_ids
// / scope_source в gar-core-api/schemas/chat.py. Ключ sessionStorage читает
// app/page.tsx при монтировании.
const SCOPE_STORAGE_KEY = "ds-chat-scope";

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

// value -> русская подпись для select-полей. Временный хардкод (issue #12) —
// заменить на публичный словарь /public/metadata-fields из gar-core-api.
const DIRECTION_LABELS: Record<string, string> = {
  "podderzhka-semi": "Поддержка семьи",
  "soobschestva-i-vzaimopomosch": "Сообщества и взаимопомощь",
};

function ruLabel(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  return DIRECTION_LABELS[value] || value;
}

export default function ArticlesPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    direction: "", category: "", doc_type: "", age: "", target_audience: "",
  });
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [facets, setFacets] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({}); // document_id -> title

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

  function toggleSelected(doc: DocumentSummary) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[doc.document_id]) delete next[doc.document_id];
      else next[doc.document_id] = articleTitle(doc);
      return next;
    });
  }

  function clearSelected() {
    setSelected({});
  }

  function askAboutSelected() {
    const document_ids = Object.keys(selected);
    if (!document_ids.length) return;
    sessionStorage.setItem(
      SCOPE_STORAGE_KEY,
      JSON.stringify({ document_ids, titles: Object.values(selected) }),
    );
    router.push("/");
  }

  const selectedCount = Object.keys(selected).length;

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
              const isSelected = Boolean(selected[doc.document_id]);
              return (
                <article className={`source-card${isSelected ? " selected" : ""}`} key={doc.document_id}>
                  <label className="select-check">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(doc)}
                      aria-label={`Выбрать «${articleTitle(doc)}» для чата`}
                    />
                    Выбрать для чата
                  </label>
                  <h2><Link href={`/articles/${doc.document_id}`}>{articleTitle(doc)}</Link></h2>
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

      {selectedCount > 0 && (
        <div className="selection-bar" role="status" aria-live="polite">
          <span>Выбрано статей: {selectedCount}</span>
          <div className="selection-bar-actions">
            <button type="button" onClick={askAboutSelected}>Спросить по выбранным</button>
            <button type="button" onClick={clearSelected}>Очистить</button>
          </div>
        </div>
      )}
    </main>
  );
}
