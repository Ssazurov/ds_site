// app/articles/page.tsx
// Раздел "Библиотека" -> "Статьи": список материалов с фильтрами по
// direction/category/age/target_audience/doc_type поверх схемы метаданных ds_search
// (issue ds_site#4, ADR-0003). doc_type запрашивает "article" и "digest"
// (ds_site#127, ADR-0024). Пагинация — накопительная "Показать ещё" (ds_site#48).

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { DocumentSummary, FilterKey } from "@/lib/gar";
import { useMetadataLabels } from "@/lib/gar/labels";
import FilterBar from "@/components/FilterBar";
import DomainFilter, { type DomainCount } from "@/components/DomainFilter";
import FavoriteButton from "@/components/FavoriteButton";
import { useFavorites } from "@/lib/favorites";
import { getDocuments, IS_STATIC } from "@/lib/gar/data";
import { replaceQuery } from "@/lib/url-state";
import { filterByTitle } from "@/lib/title-search";
import { useAssistantEnabled } from "@/lib/assistant-flag";
import { formatDate, metaReadingMinutes, readingLabel } from "@/lib/format";

// Issue #6: групповой выбор статей галочками -> scope для GAR-чата поверх
// существующего scope-tree (issue #32/#35), см. ADR-0003 п.1 и filters.document_ids
// / scope_source в gar-core-api/schemas/chat.py. Ключ sessionStorage читает
// app/page.tsx при монтировании.
const SCOPE_STORAGE_KEY = "ds-chat-scope";

// doc_type включён (ds_site#127, ADR-0024): article + digest.
const FILTER_ORDER: FilterKey[] = ["direction", "category", "doc_type", "age", "target_audience"];

const PER_PAGE = 20;
const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";

function articleTitle(doc: DocumentSummary) {
  return String(doc.metadata?.title || doc.doc_name);
}

function articleUrl(doc: DocumentSummary) {
  const url = doc.metadata?.source_url || doc.metadata?.original_url || doc.metadata?.canonical_md_url;
  return typeof url === "string" ? url : null;
}

function ArticlesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ruLabel, tree } = useMetadataLabels(DATASET_ID);
  const [page, setPage] = useState(1);
  const [docsRaw, setDocuments] = useState<DocumentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Record<string, string[]>>({});
  const [domainFacet, setDomainFacet] = useState<DomainCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({}); // document_id -> title
  const favCount = useFavorites().length;
  const assistantEnabled = useAssistantEnabled() === true; // ds_site#94: выбор для Помощника только при включённом флаге

  const urlFilters = Object.fromEntries(
    FILTER_ORDER.map((key) => [key, searchParams.get(key) || ""]),
  ) as Record<FilterKey, string>;
  const q = searchParams.get("q") || "";
  const searchAll = Boolean(q) && !IS_STATIC; // динамика: все статьи + клиентский префиксный поиск
  const documents = searchAll ? filterByTitle(docsRaw, q, articleTitle) : docsRaw;
  const urlDomains = searchParams.getAll("domain"); // ADR-0020: мультивыбор, OR внутри фильтра
  const domainKey = urlDomains.join("|");

  // Первая загрузка / смена фильтров — сброс накопленного списка.
  useEffect(() => {
    if (!DATASET_ID) return;
    const params = new URLSearchParams({ dataset_id: DATASET_ID });
    // ds_site#127: запрашиваем article и digest; если doc_type фильтр выбран — только его.
    if (urlFilters.doc_type) {
      params.set("doc_type", urlFilters.doc_type);
    } else {
      params.append("doc_type", "article");
      params.append("doc_type", "digest");
    }
    for (const key of FILTER_ORDER) {
      if (key === "doc_type") continue; // уже добавлен выше
      if (urlFilters[key]) params.set(key, urlFilters[key]);
    }
    params.set("per_page", String(PER_PAGE));
    params.set("page", "1");
    for (const d of urlDomains) params.append("domain", d);
    // Динамика: GAR не принимает q — при поиске грузим все статьи и фильтруем на клиенте.
    // Статика: поиск MiniSearch'ем внутри getDocuments.
    if (searchAll) params.set("per_page", "100");
    if (q && IS_STATIC) params.set("q", q);

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        let data = await getDocuments(params);
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        if (searchAll) {
          const all = [...(data.documents || [])];
          for (let p = 2; all.length < (data.total || 0) && p <= 50; p++) {
            params.set("page", String(p));
            const more = await getDocuments(params);
            if (cancelled) return;
            if (more.error) throw new Error(more.error);
            if (!more.documents?.length) break;
            all.push(...more.documents);
          }
          data = { ...data, documents: all };
        }
        setDocuments(data.documents || []);
        setTotal(data.total || 0);
        setFacets((prev) => (data.facets ? data.facets : prev));
        setDomainFacet((prev) => (data.domains ? data.domains : prev));
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
  }, [urlFilters.direction, urlFilters.category, urlFilters.doc_type, urlFilters.age, urlFilters.target_audience, IS_STATIC ? q : Boolean(q), domainKey]);

  function setQuery(v: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (v) params.set("q", v);
    else params.delete("q");
    replaceQuery(params);
  }

  async function loadMore() {
    if (!DATASET_ID || loadingMore) return;
    const nextPage = page + 1;
    const params = new URLSearchParams({ dataset_id: DATASET_ID });
    // ds_site#127: запрашиваем article и digest; если doc_type фильтр выбран — только его.
    if (urlFilters.doc_type) {
      params.set("doc_type", urlFilters.doc_type);
    } else {
      params.append("doc_type", "article");
      params.append("doc_type", "digest");
    }
    for (const key of FILTER_ORDER) {
      if (key === "doc_type") continue; // уже добавлен выше
      if (urlFilters[key]) params.set(key, urlFilters[key]);
    }
    params.set("per_page", String(PER_PAGE));
    params.set("page", String(nextPage));
    for (const d of urlDomains) params.append("domain", d);
    if (q && IS_STATIC) params.set("q", q);

    setLoadingMore(true);
    setError(null);
    try {
      const data = await getDocuments(params);
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
    const nextFilters = { ...urlFilters, [key]: value };
    if (key === "direction" && value !== urlFilters.direction) nextFilters.category = "";
    updateURL(nextFilters);
  }

  function clearFilters() {
    const emptyFilters = { direction: "", category: "", doc_type: "", age: "", target_audience: "" };
    updateURL(emptyFilters, []);
  }

  function updateURL(f: Record<FilterKey, string>, domains: string[] = urlDomains) {
    const params = new URLSearchParams();
    for (const key of FILTER_ORDER) {
      if (f[key]) params.set(key, f[key]);
    }
    for (const d of domains) params.append("domain", d);
    if (q) params.set("q", q);
    replaceQuery(params);
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
  const hasMore = !searchAll && docsRaw.length < total;

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <h1>Статьи</h1>
      </header>

      <section className="chat-panel" aria-label="Фильтры и список статей">
        <FilterBar values={urlFilters} facets={facets} ruLabel={ruLabel} onChange={setFilter} onClear={clearFilters} disabled={loading} tree={tree} titleQuery={q} onTitleQuery={setQuery} />

        <DomainFilter domains={domainFacet} selected={urlDomains} onChange={(next) => updateURL(urlFilters, next)} disabled={loading} />

        <p className="fb-total"><Link href="/favorites">★ Избранное ({favCount})</Link></p>
        {total > 0 && <p className="fb-total">Всего найдено: {searchAll ? documents.length : total}</p>}


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
                const dirValue = doc.metadata?.direction;
                const dir = dirValue ? ruLabel("direction", dirValue) : null;
                const cat = doc.metadata?.category ? ruLabel("category", doc.metadata.category) : null;
                const desc = typeof doc.metadata?.description === "string" ? doc.metadata.description : "";
                const mins = metaReadingMinutes(doc.metadata);
                const when = [formatDate(doc.metadata?.publish_date), mins ? readingLabel(mins) : null].filter(Boolean).join(" · ");
                const docType = typeof doc.metadata?.doc_type === "string" ? doc.metadata.doc_type : null;
                const isDigest = docType === "digest";
                return (
                  <article className={`source-card${isSelected ? " selected" : ""}`} key={doc.document_id}>
                    <div className="card-head">
                      {dir ? <Link className="tag" href={`/articles?direction=${dirValue}`}>{dir}</Link> : <span />}
                      <FavoriteButton id={doc.document_id} title={articleTitle(doc)} />
                      {assistantEnabled && <label className="select-check" title="Выбрать для чата">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(doc)}
                          aria-label={`Выбрать «${articleTitle(doc)}» для чата`}
                        />
                      </label>}
                    </div>
                    {cat && <p className="card-cat">{cat}</p>}
                    {isDigest && <span className="tag digest-badge">Пересказ</span>}
                    <h2><Link href={`/articles/${doc.document_id}`}>{articleTitle(doc)}</Link></h2>
                    {desc && <p className="card-desc">{desc}</p>}
                    <div className="card-foot">
                      <span>{when}</span>
                      {url && (
                        <a href={url} target="_blank" rel="noopener nofollow">
                          {isDigest ? "Полный текст на сайте источника" : "Источник"} <span aria-hidden="true">↗</span>
                        </a>
                      )}
                    </div>
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

      {assistantEnabled && selectedCount > 0 && (
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
