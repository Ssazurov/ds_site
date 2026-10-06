// app/links/page.tsx
// Раздел "Библиотека" -> "Ссылки": документы doc_type=link из GAR
// (ADR-0016, issue #77) через /public/documents.
// Только внешние ресурсы (doc_type=link) — термины/сокращения глоссария
// живут отдельно на /glossary (ds_site#46).
// Карточка ресурса + структура страницы (без eyebrow/lede, фильтры + сброс) —
// по образцу /articles (ds_site#53). Поле "теги" в карточке не показывается:
// в метаданных документа такого поля нет — нужна отдельная задача с ADR
// на расширение контракта (ADR-0015, см. также ds_site#52).
// Список накопительно по 20 с «Показать ещё», ?page= в URL
// (ds_site#129, ADR-0025) — вместо загрузки всех ссылок сразу.

"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { metaStr } from "@/lib/gar/documents-by-type";
import { useMetadataLabels } from "@/lib/gar/labels";
import type { FilterKey } from "@/lib/gar";
import FilterBar from "@/components/FilterBar";
import LoadMore from "@/components/LoadMore";
import TagChips from "@/components/TagChips";
import TagFilterNotice from "@/components/TagFilterNotice";
import { docTags, TAG_PARAM } from "@/lib/gar/tags";
import { useDocumentFeed } from "@/lib/use-document-feed";
import { useScrollRestore } from "@/lib/scroll-restore";
import { pageParam, withPageParam } from "@/lib/pagination";
import { replaceQuery } from "@/lib/url-state";

const FILTER_LABELS: Record<Exclude<FilterKey, "doc_type">, string> = {
  direction: "Направление",
  category: "Категория",
  age: "Возраст",
  target_audience: "Аудитория",
};

const OTHER_FILTERS = Object.keys(FILTER_LABELS) as Exclude<FilterKey, "doc_type">[];

const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";


function LinksContent() {
  const searchParams = useSearchParams();
  const { ruLabel } = useMetadataLabels(DATASET_ID);

  const filters = Object.fromEntries(
    OTHER_FILTERS.map((key) => [key, searchParams.get(key) || ""]),
  ) as Record<Exclude<FilterKey, "doc_type">, string>;

  const tag = searchParams.get(TAG_PARAM) || ""; // ds_site#138

  const feed = useDocumentFeed({
    datasetId: DATASET_ID,
    docTypes: ["link"],
    filters: { ...filters, [TAG_PARAM]: tag },
    domains: [],
    q: "",
    initialPage: pageParam(searchParams),
    onPageChange: (p) => replaceQuery(withPageParam(searchParams, p)),
  });
  const { documents, loaded, total, loading, loadingMore, hasMore, showMore, error } = feed;
  useScrollRestore(!loading && documents.length > 0); // ds_site#167

  function setFilter(key: FilterKey, value: string) {
    if (key === "doc_type") return; // links не использует doc_type
    const next = { ...filters, [key]: value };
    if (key === "direction" && value !== filters.direction) next.category = "";
    updateURL(next);
  }

  function clearFilters() {
    updateURL({ direction: "", category: "", age: "", target_audience: "" });
  }

  function updateURL(f: Record<Exclude<FilterKey, "doc_type">, string>) {
    const params = new URLSearchParams();
    for (const key of OTHER_FILTERS) {
      if (f[key]) params.set(key, f[key]);
    }
    if (tag) params.set(TAG_PARAM, tag);
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
        <h1>Ссылки</h1>
      </header>

      <section className="chat-panel" aria-label="Фильтры и список ссылок">
        <FilterBar values={filters} facets={feed.facets} ruLabel={ruLabel} onChange={setFilter} onClear={clearFilters} disabled={loading} />

        <TagFilterNotice tag={tag} onClear={clearTag} disabled={loading} />

        {total > 0 && <p className="fb-total">Всего найдено: {total}</p>}
        {error && <p className="message error" role="alert">{error}</p>}
        {loading && <p className="message">Загружаю...</p>}

        {!loading && !error && documents.length === 0 && (
          <p className="message">Ничего не найдено по выбранным фильтрам.</p>
        )}

        {!loading && documents.length > 0 && (
          <>
            <div className="source-grid">
              {documents.map((link) => {
                const src = metaStr(link, "source_url");
                const dir = ruLabel("direction", metaStr(link, "direction"));
                const cat = ruLabel("category", metaStr(link, "category"));
                const aud = ruLabel("target_audience", metaStr(link, "target_audience"));
                return (
                  <article className="source-card" key={link.document_id}>
                    {dir && <span className="tag">{dir}</span>}
                    {cat && <p className="card-cat">{cat}</p>}
                    <h2>{src ? <a href={src} target="_blank" rel="noreferrer">{link.doc_name}</a> : link.doc_name}</h2>
                    <TagChips tags={docTags(link.metadata)} basePath="/links" />
                    <div className="card-foot">
                      <span>{aud}</span>
                      {src ? <span aria-hidden="true">↗</span> : <span className="no-link">Ссылка недоступна</span>}
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

export default function LinksPage() {
  return (
    <Suspense fallback={<div className="chat-shell"><p className="message">Загружаю...</p></div>}>
      <LinksContent />
    </Suspense>
  );
}
