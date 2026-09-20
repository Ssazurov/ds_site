// app/news/page.tsx
// Раздел "Новости": лента опубликованных новостей (doc_type=news, см.
// ds_search/src/news/publish.py). Публикация уже уходит в GAR — отдельного
// хранилища на сайте нет, читаем через тот же /public/documents, что и
// "Статьи" (ADR-0003), с фиксированным doc_type=news.
// Шапка без eyebrow/lede + блок фильтров direction/category/age/
// target_audience (как на /articles, по образцу ds_site#53) — ds_site#52.
// Фильтр по тегам не реализован: поля tags нет в схеме метаданных GAR,
// см. #61 (нужен ADR).

"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { DocumentSummary, DocumentsResponse, FilterKey } from "@/lib/gar";
import { useMetadataLabels } from "@/lib/gar/labels";
import FilterBar from "@/components/FilterBar";
import { formatDate } from "@/lib/format";

const FILTER_LABELS: Record<Exclude<FilterKey, "doc_type">, string> = {
  direction: "Направление",
  category: "Категория",
  age: "Возраст",
  target_audience: "Аудитория",
};
const FILTER_ORDER = Object.keys(FILTER_LABELS) as Exclude<FilterKey, "doc_type">[];

const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";

function newsTitle(doc: DocumentSummary) {
  return String(doc.metadata?.title || doc.doc_name);
}

function newsSummary(doc: DocumentSummary): string | null {
  const s = doc.metadata?.description;
  return typeof s === "string" && s.trim() ? s : null;
}

function newsUrl(doc: DocumentSummary): string | null {
  const url = doc.metadata?.source_url;
  return typeof url === "string" ? url : null;
}

function NewsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ruLabel } = useMetadataLabels(DATASET_ID);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [facets, setFacets] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urlFilters = Object.fromEntries(
    FILTER_ORDER.map((key) => [key, searchParams.get(key) || ""]),
  ) as Record<Exclude<FilterKey, "doc_type">, string>;

  useEffect(() => {
    if (!DATASET_ID) return;
    const params = new URLSearchParams({ dataset_id: DATASET_ID, doc_type: "news", per_page: "50" });
    for (const key of FILTER_ORDER) {
      if (urlFilters[key]) params.set(key, urlFilters[key]);
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/gar/documents?${params.toString()}`);
        const data = (await res.json()) as DocumentsResponse;
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        const docs = [...(data.documents || [])].sort((a, b) => {
          const da = String(a.metadata?.publish_date || "");
          const dbv = String(b.metadata?.publish_date || "");
          return dbv.localeCompare(da);
        });
        setDocuments(docs);
        setFacets((prev) => (data.facets ? data.facets : prev));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить новости.");
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

  function setFilter(key: Exclude<FilterKey, "doc_type">, value: string) {
    const next = { ...urlFilters, [key]: value };
    if (key === "direction" && value !== urlFilters.direction) next.category = "";
    updateURL(next);
  }

  function clearFilters() {
    updateURL({ direction: "", category: "", age: "", target_audience: "" });
  }

  function updateURL(f: Record<Exclude<FilterKey, "doc_type">, string>) {
    const params = new URLSearchParams();
    for (const key of FILTER_ORDER) {
      if (f[key]) params.set(key, f[key]);
    }
    router.replace(`/news?${params.toString()}`, { scroll: false });
  }


  return (
    <main className="chat-shell">
      <header className="chat-header">
        <h1>Новости</h1>
      </header>

      <section className="chat-panel" aria-label="Фильтры и список новостей">
        <FilterBar values={urlFilters} facets={facets} ruLabel={ruLabel} onChange={setFilter} onClear={clearFilters} disabled={loading} />


        {!DATASET_ID && <p className="message error" role="alert">Не настроен идентификатор набора данных.</p>}
        {error && <p className="message error" role="alert">{error}</p>}
        {loading && <p className="message">Загружаю...</p>}

        {!loading && !error && documents.length === 0 && (
          <p className="message">Пока нет опубликованных новостей по выбранным фильтрам.</p>
        )}

        {!loading && documents.length > 0 && (
          <div className="source-grid">
            {documents.map((doc) => {
              const url = newsUrl(doc);
              const date = formatDate(doc.metadata?.publish_date);
              const summary = newsSummary(doc);
              const dirValue = doc.metadata?.direction;
              const dir = dirValue ? ruLabel("direction", dirValue) : null;
              const cat = doc.metadata?.category ? ruLabel("category", doc.metadata.category) : null;
              return (
                <article className="source-card" key={doc.document_id}>
                  {dir && <Link className="tag" href={`/news?direction=${dirValue}`}>{dir}</Link>}
                  {cat && <p className="card-cat">{cat}</p>}
                  <h2><Link href={`/news/${doc.document_id}`}>{newsTitle(doc)}</Link></h2>
                  {summary && <p className="card-desc">{summary}</p>}
                  <div className="card-foot">
                    <span>{date}</span>
                    {url && (
                      <a href={url} target="_blank" rel="noreferrer">
                        Источник <span aria-hidden="true">↗</span>
                      </a>
                    )}
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

export default function NewsPage() {
  return (
    <Suspense fallback={<div className="chat-shell"><p className="message">Загружаю...</p></div>}>
      <NewsContent />
    </Suspense>
  );
}
