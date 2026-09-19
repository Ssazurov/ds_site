// app/articles/page.tsx
// Раздел "Библиотека" -> "Статьи": список материалов с фильтрами по
// direction/category/age/target_audience поверх схемы метаданных ds_search
// (issue ds_site#4, ADR-0003). doc_type жёстко зафиксирован как "article"
// (ds_site#51, по аналогии с news/page.tsx). Пагинация — накопительная
// "Показать ещё" (ds_site#48).

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { DocumentSummary, DocumentsResponse, FilterKey } from "@/lib/gar";
import { useMetadataLabels } from "@/lib/gar/labels";

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

// doc_type исключён (ds_site#51) — фиксирован как "article" на запросе.
const FILTER_ORDER: FilterKey[] = ["direction", "category", "age", "target_audience"];

const PER_PAGE = 20;
const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";

function articleTitle(doc: DocumentSummary) {
  return String(doc.metadata?.title || doc.doc_name);
}

function articleUrl(doc: DocumentSummary) {
  const url = doc.metadata?.source_url || doc.metadata?.original_url || doc.metadata?.canonical_md_url;
  return typeof url === "string" ? url : null;
}

function MetadataLinks({ metadata, getLabelFn }: { metadata?: DocumentSummary["metadata"]; getLabelFn: (field: FilterKey, value: unknown) => string | null }) {
  const parts: React.ReactNode[] = [];

  if (metadata?.direction) {
    const label = getLabelFn("direction", metadata.direction);
    if (label) {
      parts.push(
        <Link key="direction" href={`/articles?direction=${metadata.direction}`}>
          {label}
        </Link>
      );
    }
  }

  if (metadata?.category) {
    const label = getLabelFn("category", metadata.category);
    if (label) {
      parts.push(
        <Link key="category" href={`/articles?direction=${metadata.direction || ""}&category=${metadata.category}`}>
          {label}
        </Link>
      );
    }
  }

  if (metadata?.doc_type) {
    const label = getLabelFn("doc_type", metadata.doc_type);
    if (label) {
      parts.push(<span key="doc_type">{label}</span>);
    }
  }

  return <>{parts.reduce<React.ReactNode[]>((acc, part, i) => i === 0 ? [part] : [...acc, " · ", part], [])}</>;
}

function ArticlesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ruLabel } = useMetadataLabels(DATASET_ID);
  const [filters, setFilters] = useState<Record<FilterKey, string>>(() => ({
    direction: searchParams.get("direction") || "",
    category: searchParams.get("category") || "",
    doc_type: "",
    age: searchParams.get("age") || "",
    target_audience: searchParams.get("target_audience") || "",
  }));
  const [page, setPage] = useState(1);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({}); // document_id -> title

  const urlFilters = Object.fromEntries(
    FILTER_ORDER.map((key) => [key, searchParams.get(key) || ""]),
  ) as Record<FilterKey, string>;

  // Первая загрузка / смена фильтров — сброс накопленного списка.
  useEffect(() => {
    if (!DATASET_ID) return;
    const params = new URLSearchParams({ dataset_id: DATASET_ID, doc_type: "article" });
    for (const key of FILTER_ORDER) {
      if (urlFilters[key]) params.set(key, urlFilters[key]);
    }
    params.set("per_page", String(PER_PAGE));
    params.set("page", "1");

    let cancelled = false;
    async function load() {
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
        setPage(1);
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
  }, [urlFilters.direction, urlFilters.category, urlFilters.age, urlFilters.target_audience]);

  async function loadMore() {
    if (!DATASET_ID || loadingMore) return;
    const nextPage = page + 1;
    const params = new URLSearchParams({ dataset_id: DATASET_ID, doc_type: "article" });
    for (const key of FILTER_ORDER) {
      if (urlFilters[key]) params.set(key, urlFilters[key]);
    }
    params.set("per_page", String(PER_PAGE));
    params.set("page", String(nextPage));

    setLoadingMore(true);
    setError(null);
    try {
      const res = await fetch(`/api/gar/documents?${params.toString()}`);
      const data = (await res.json()) as DocumentsResponse;
      if (data.error) throw new Error(data.error);
      setDocuments((prev) => [...prev, ...(data.documents || [])]);
      setTotal(data.total || 0);
      setPage(nextPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить статьи.");
    } finally {
      setLoadingMore(false);
    }
  }

  function setFilter(key: FilterKey, value: string) {
    const nextFilters = { ...filters, [key]: value };
    if (key === "direction" && value !== filters.direction) nextFilters.category = "";
    setFilters(nextFilters);
    updateURL(nextFilters);
  }

  function clearFilters() {
    const emptyFilters = { direction: "", category: "", doc_type: "", age: "", target_audience: "" };
    setFilters(emptyFilters);
    updateURL(emptyFilters);
  }

  function updateURL(f: Record<FilterKey, string>) {
    const params = new URLSearchParams();
    for (const key of FILTER_ORDER) {
      if (f[key]) params.set(key, f[key]);
    }
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
    router.push("/assistant");
  }

  const selectedCount = Object.keys(selected).length;
  const hasMore = documents.length < total;

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <h1>Статьи</h1>
      </header>

      <section className="chat-panel" aria-label="Фильтры и список статей">
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1rem" }}>
          <fieldset className="response-mode" aria-label="Фильтры" disabled={loading} style={{ flex: 1 }}>
            {FILTER_ORDER.map((key) => (
              <select
                key={key}
                value={urlFilters[key]}
                onChange={(event) => setFilter(key, event.target.value)}
                aria-label={FILTER_LABELS[key]}
                title={urlFilters[key] ? ruLabel(key, urlFilters[key]) || undefined : undefined}
              >
                <option value="">{FILTER_LABELS[key]}: все</option>
                {(facets[key] || []).map((value) => (
                  <option key={value} value={value} title={ruLabel(key, value)}>{clip(ruLabel(key, value))}</option>
                ))}
              </select>
            ))}
          </fieldset>
          <button type="button" onClick={clearFilters} disabled={loading}>Сбросить фильтры</button>
        </div>

        {total > 0 && <p className="message">Всего найдено: {total}</p>}
        {!loading && documents.length > 0 && (
          <p className="message hint">Отметьте галочкой статьи, чтобы спросить по ним в чате</p>
        )}

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
                    <label className="select-check select-check-icon" title="Выбрать для чата">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(doc)}
                        aria-label={`Выбрать «${articleTitle(doc)}» для чата`}
                      />
                      <span aria-hidden="true">💬</span>
                    </label>
                    <h2><Link href={`/articles/${doc.document_id}`}>{articleTitle(doc)}</Link></h2>
                    <p><MetadataLinks metadata={doc.metadata} getLabelFn={ruLabel} /></p>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="source-link">
                        Источник <span aria-hidden="true">↗</span>
                      </a>
                    ) : <span className="no-link">Ссылка недоступна</span>}
                  </article>
                );
              })}
            </div>

            {hasMore && (
              <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
                <button type="button" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Загружаю..." : "Показать ещё"}
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

const clip = (t: string, n = 32) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

export default function ArticlesPage() {
  return (
    <Suspense fallback={<div className="chat-shell"><p className="message">Загружаю...</p></div>}>
      <ArticlesContent />
    </Suspense>
  );
}
