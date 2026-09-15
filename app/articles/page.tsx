// app/articles/page.tsx
// Раздел "Библиотека" -> "Статьи": список материалов с фильтрами по
// direction/category/doc_type/age/target_audience поверх схемы метаданных
// ds_search (issue ds_site#4, ADR-0003).

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { DocumentSummary, DocumentsResponse, FilterKey } from "@/lib/gar";

// Issue #6: групповой выбор статей галочками -> scope для GAR-чата поверх
// существующего scope-tree (issue #32/#35), см. ADR-0003 п.1 и filters.document_ids
// / scope_source в gar-core-api/schemas/chat.py. Ключ sessionStorage читает
// app/page.tsx при монтировании.
const SCOPE_STORAGE_KEY = "ds-chat-scope";

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

function ArticlesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Record<FilterKey, string>>(() => ({
    direction: searchParams.get("direction") || "",
    category: searchParams.get("category") || "",
    doc_type: searchParams.get("doc_type") || "",
    age: searchParams.get("age") || "",
    target_audience: searchParams.get("target_audience") || "",
  }));
  const [perPage, setPerPage] = useState(() => {
    const pp = parseInt(searchParams.get("per_page") || "10", 10);
    return [10, 20, 50].includes(pp) ? pp : 10;
  });
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get("page") || "1", 10)));
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({}); // document_id -> title

  // Загрузка документов с учётом фильтров и пагинации
  useEffect(() => {
    if (!DATASET_ID) return;
    const params = new URLSearchParams({ dataset_id: DATASET_ID });
    for (const key of FILTER_ORDER) {
      if (filters[key]) params.set(key, filters[key]);
    }
    params.set("per_page", String(perPage));
    params.set("page", String(page));

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
        setTotal(data.total || 0);
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
  }, [filters.direction, filters.category, filters.doc_type, filters.age, filters.target_audience, perPage, page]);

  function setFilter(key: FilterKey, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Сбросить на первую страницу при смене фильтра
    updateURL({ ...filters, [key]: value }, perPage, 1);
  }

  function clearFilters() {
    const emptyFilters = { direction: "", category: "", doc_type: "", age: "", target_audience: "" };
    setFilters(emptyFilters);
    setPage(1);
    updateURL(emptyFilters, perPage, 1);
  }

  function changePerPage(value: number) {
    setPerPage(value);
    setPage(1);
    updateURL(filters, value, 1);
  }

  function changePage(newPage: number) {
    setPage(newPage);
    updateURL(filters, perPage, newPage);
  }

  function updateURL(f: Record<FilterKey, string>, pp: number, p: number) {
    const params = new URLSearchParams();
    for (const key of FILTER_ORDER) {
      if (f[key]) params.set(key, f[key]);
    }
    params.set("per_page", String(pp));
    params.set("page", String(p));
    router.replace(`/articles?${params.toString()}`, { scroll: false });
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
  const totalPages = Math.ceil(total / perPage);

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <p className="eyebrow">Библиотека</p>
        <h1>Статьи</h1>
        <p className="lede">Материалы базы знаний с фильтрами по направлению, категории, типу, возрасту и аудитории.</p>
      </header>

      <section className="chat-panel" aria-label="Фильтры и список статей">
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1rem" }}>
          <fieldset className="response-mode" disabled={loading} style={{ flex: 1 }}>
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
          <button type="button" onClick={clearFilters} disabled={loading}>Сбросить фильтры</button>
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
          <label>
            Показывать по:
            <select value={perPage} onChange={(e) => changePerPage(Number(e.target.value))} disabled={loading}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </label>
          {total > 0 && <span>Всего найдено: {total}</span>}
        </div>

        {!DATASET_ID && <p className="message error" role="alert">Не настроен идентификатор набора данных.</p>}
        {error && <p className="message error" role="alert">{error}</p>}
        {loading && <p className="message">Загружаю...</p>}

        {!loading && !error && documents.length === 0 && (
          <p className="message">Ничего не найдено по выбранным фильтрам.</p>
        )}

        {!loading && documents.length > 0 && (
          <>
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

            {totalPages > 1 && (
              <div className="pagination" style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                <button onClick={() => changePage(1)} disabled={page === 1 || loading}>
                  Первая
                </button>
                <button onClick={() => changePage(page - 1)} disabled={page === 1 || loading}>
                  Предыдущая
                </button>
                <span style={{ padding: "0.5rem" }}>
                  Страница {page} из {totalPages}
                </span>
                <button onClick={() => changePage(page + 1)} disabled={page >= totalPages || loading}>
                  Следующая
                </button>
                <button onClick={() => changePage(totalPages)} disabled={page === totalPages || loading}>
                  Последняя
                </button>
              </div>
            )}
          </>
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

export default function ArticlesPage() {
  return (
    <Suspense fallback={<div className="chat-shell"><p className="message">Загружаю...</p></div>}>
      <ArticlesContent />
    </Suspense>
  );
}
