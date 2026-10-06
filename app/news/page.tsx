// app/news/page.tsx
// Раздел "Новости": лента опубликованных новостей (doc_type=news, см.
// ds_search/src/news/publish.py). Публикация уже уходит в GAR — отдельного
// хранилища на сайте нет, читаем через тот же /public/documents, что и
// "Статьи" (ADR-0003), с фиксированным doc_type=news.
// Шапка без eyebrow/lede + блок фильтров direction/category/age/
// target_audience (как на /articles, по образцу ds_site#53) — ds_site#52.
// Фильтр по тегам не реализован: поля tags нет в схеме метаданных GAR,
// см. #61 (нужен ADR).
// Пагинация — общая накопительная «Показать ещё», порция 20, ?page= в URL
// (ds_site#129, ADR-0025).

"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { DocumentSummary, FilterKey } from "@/lib/gar";
import { useMetadataLabels } from "@/lib/gar/labels";
import FilterBar from "@/components/FilterBar";
import SortDateBar, { DEFAULT_SORT, type SortBy, type SortDir } from "@/components/SortDateBar";
import LoadMore from "@/components/LoadMore";
import TagChips from "@/components/TagChips";
import TagFilterNotice from "@/components/TagFilterNotice";
import { docTags, TAG_PARAM } from "@/lib/gar/tags";
import { useDocumentFeed } from "@/lib/use-document-feed";
import { pageParam, withPageParam } from "@/lib/pagination";
import { formatDate } from "@/lib/format";

import { replaceQuery } from "@/lib/url-state";

const FILTER_LABELS: Record<Exclude<FilterKey, "doc_type">, string> = {
  direction: "Направление",
  category: "Категория",
  age: "Возраст",
  target_audience: "Аудитория",
};
const FILTER_ORDER = Object.keys(FILTER_LABELS) as Exclude<FilterKey, "doc_type">[];

const SORT_PARAMS = ["date_from", "date_to", "sort_by", "sort_dir"] as const;

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
  const searchParams = useSearchParams();
  const { ruLabel, tree } = useMetadataLabels(DATASET_ID);

  const urlFilters = Object.fromEntries(
    FILTER_ORDER.map((key) => [key, searchParams.get(key) || ""]),
  ) as Record<Exclude<FilterKey, "doc_type">, string>;
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const sortBy = (searchParams.get("sort_by") as SortBy) || DEFAULT_SORT.by;
  const sortDir = (searchParams.get("sort_dir") as SortDir) || DEFAULT_SORT.dir;
  const q = searchParams.get("q") || "";
  const tag = searchParams.get(TAG_PARAM) || ""; // ds_site#138

  // ds_site#131, ADR-0026: q передаётся в GAR, серверная фильтрация по названию.
  // Статика ищет MiniSearch'ем в getDocuments.
  const feed = useDocumentFeed({
    datasetId: DATASET_ID,
    docTypes: ["news"],
    filters: { ...urlFilters, [TAG_PARAM]: tag, date_from: dateFrom, date_to: dateTo, sort_by: sortBy, sort_dir: sortDir },
    domains: [],
    q,
    initialPage: pageParam(searchParams),
    onPageChange: (p) => replaceQuery(withPageParam(searchParams, p)),
  });
  const { documents, loaded, total, loading, loadingMore, hasMore, showMore, error } = feed;

  function setQuery(v: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (v) params.set("q", v);
    else params.delete("q");
    replaceQuery(params);
  }

  function setFilter(key: FilterKey, value: string) {
    if (key === "doc_type") return; // news не использует doc_type
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
    if (q) params.set("q", q);
    if (tag) params.set(TAG_PARAM, tag);
    for (const k of SORT_PARAMS) {
      const v = searchParams.get(k);
      if (v) params.set(k, v);
    }
    replaceQuery(params);
  }

  function setSortDate(patch: Partial<Record<(typeof SORT_PARAMS)[number], string>>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    replaceQuery(params);
  }

  function clearTag() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(TAG_PARAM);
    params.delete("page");
    replaceQuery(params);
  }


  return (
    <main className="chat-shell">
      <header className="chat-header">
        <h1>Новости</h1>
      </header>

      <section className="chat-panel" aria-label="Фильтры и список новостей">
        <FilterBar values={urlFilters} facets={feed.facets} ruLabel={ruLabel} onChange={setFilter} onClear={clearFilters} disabled={loading} tree={tree} titleQuery={q} onTitleQuery={setQuery} hide={["doc_type"]} />

        <SortDateBar dateFrom={dateFrom} dateTo={dateTo} sortBy={sortBy} sortDir={sortDir} onChange={setSortDate} disabled={loading} />

        <TagFilterNotice tag={tag} onClear={clearTag} disabled={loading} />

        {total > 0 && <p className="fb-total">Всего найдено: {total}</p>}
        {!DATASET_ID && <p className="message error" role="alert">Не настроен идентификатор набора данных.</p>}
        {error && <p className="message error" role="alert">{error}</p>}
        {loading && <p className="message">Загружаю...</p>}

        {!loading && !error && documents.length === 0 && (
          <p className="message">Пока нет опубликованных новостей по выбранным фильтрам.</p>
        )}

        {!loading && documents.length > 0 && (
          <>
            <div className="source-grid">
              {documents.map((doc) => {
                const url = newsUrl(doc);
                const date = formatDate(doc.metadata?.publish_date);
                const summary = newsSummary(doc);
                const dirValue = typeof doc.metadata?.direction === "string" ? doc.metadata.direction : null;
                const catValue = typeof doc.metadata?.category === "string" ? doc.metadata.category : null;
                const dir = dirValue ? ruLabel("direction", dirValue) : null;
                const cat = catValue ? ruLabel("category", catValue) : null;
                return (
                  <article className="source-card" key={doc.document_id}>
                    {dir && dirValue && <Link className="tag" href={`/news?direction=${dirValue}`}>{dir}</Link>}
                    {cat && catValue && (
                      <Link className="card-cat" href={`/news?direction=${dirValue || ""}&category=${catValue}`}>
                        {cat}
                      </Link>
                    )}
                    <h2><Link href={`/news/${doc.document_id}`}>{newsTitle(doc)}</Link></h2>
                    <TagChips tags={docTags(doc.metadata)} basePath="/news" />
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

            <LoadMore
              hasMore={hasMore}
              loading={loadingMore}
              onClick={showMore}
              hint={total > 0 ? `Показано: ${loaded} из ${total}` : null}
            />
          </>
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
