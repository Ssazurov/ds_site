// lib/use-document-feed.ts
// Общая накопительная пагинация «Показать ещё» для страниц, которые читают
// GAR /public/documents: /articles, /news, /links (ds_site#129, ADR-0025).
//
// Логика едина: порция PAGE_SIZE документов за запрос, следующая подгружается
// по кнопке, число загруженных порций пишется в ?page= (см. lib/pagination.ts).
// Поиск: GAR не принимает q, поэтому при searchAll набор грузится целиком
// порциями по 100 и фильтруется по названию на клиенте (lib/title-search.ts);
// в этом режиме кнопки «Показать ещё» нет — показываются все совпадения.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getDocuments, IS_STATIC } from "./gar/data";
import type { DocumentSummary } from "./gar/types";
import { filterByTitle } from "./title-search";
import { MAX_PER_REQUEST, PAGE_SIZE } from "./pagination";

export type DomainCount = { domain: string; count: number };

export type DocumentFeedOptions = {
  datasetId: string;
  /** doc_type (или несколько) запроса */
  docTypes: string[];
  /** фильтры direction/category/age/target_audience (doc_type задаётся docTypes) */
  filters: Record<string, string>;
  /** мультивыбор доменов (ADR-0020) */
  domains: string[];
  /** поисковый запрос из URL */
  q: string;
  /** true — GAR не умеет q: грузим весь набор и фильтруем по названию на клиенте */
  searchAll: boolean;
  titleOf: (doc: DocumentSummary) => string;
  pageSize?: number;
  /** сколько порций уже загружено (?page=) — восстанавливаемое состояние */
  initialPage?: number;
  /** вызывается после успешной догрузки: страница пишет ?page= */
  onPageChange?: (page: number) => void;
};

export type DocumentFeed = {
  documents: DocumentSummary[];
  /** документов получено от GAR (до клиентской фильтрации по q) */
  loaded: number;
  total: number;
  facets: Record<string, string[]>;
  domains: DomainCount[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  showMore: () => void;
  error: string | null;
};

type Loaded = {
  key: string;
  docs: DocumentSummary[];
  total: number;
  facets: Record<string, string[]>;
  domains: DomainCount[];
};

export function useDocumentFeed(options: DocumentFeedOptions): DocumentFeed {
  const {
    datasetId, docTypes, filters, domains, q, searchAll, titleOf,
    pageSize = PAGE_SIZE, initialPage = 1, onPageChange,
  } = options;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [page, setPage] = useState(initialPage);

  // Один ключ на весь вход (docTypes/фильтры/домены/запрос) — смена любого
  // из них перезагружает ленту с первой порции. Страницы создают объекты
  // заново на каждом рендере, поэтому в эффект попадает строка, а из неё
  // восстанавливается стабильная конфигурация запроса.
  const key = JSON.stringify({ datasetId, docTypes, filters, domains, q });
  const cfg = useMemo(
    () => JSON.parse(key) as {
      datasetId: string;
      docTypes: string[];
      filters: Record<string, string>;
      domains: string[];
    },
    [key],
  );

  const buildParams = useCallback(
    (pageNumber: number, perPage: number) => {
      const params = new URLSearchParams({ dataset_id: cfg.datasetId });
      for (const t of cfg.docTypes) params.append("doc_type", t);
      for (const [k, v] of Object.entries(cfg.filters)) {
        if (k !== "doc_type" && v) params.set(k, v);
      }
      for (const d of cfg.domains) params.append("domain", d);
      // Статический экспорт ищет MiniSearch'ем внутри getDocuments (q),
      // GAR параметр не принимает — там поиск клиентский (searchAll).
      if (IS_STATIC && q) params.set("q", q);
      params.set("per_page", String(perPage));
      params.set("page", String(pageNumber));
      return params;
    },
    [cfg, q],
  );

  useEffect(() => {
    if (!cfg.datasetId) return;
    let cancelled = false;
    async function load() {
      try {
        const collected: DocumentSummary[] = [];
        let nextTotal = 0;
        let nextFacets: Record<string, string[]> | null = null;
        let nextDomains: DomainCount[] | null = null;

        const take = async (pageNumber: number, perPage: number) => {
          const before = collected.length;
          const data = await getDocuments(buildParams(pageNumber, perPage));
          if (cancelled) return 0;
          if (data.error) throw new Error(data.error);
          nextTotal = data.total ?? collected.length;
          if (data.facets) nextFacets = data.facets;
          if (data.domains) nextDomains = data.domains;
          collected.push(...(data.documents ?? []));
          return collected.length - before;
        };

        if (searchAll) {
          // GAR без q: весь набор, порциями по 100 (лимит per_page).
          for (let p = 1; p <= 50; p++) {
            const got = await take(p, MAX_PER_REQUEST);
            if (cancelled) return;
            if (!got || collected.length >= nextTotal) break;
          }
        } else {
          const want = pageSize * initialPage;
          if (want <= MAX_PER_REQUEST) {
            // ?page= до 5 — одним запросом (GAR: page=1, per_page=N).
            await take(1, want);
          } else {
            for (let p = 1; p <= initialPage; p++) await take(p, pageSize);
          }
        }
        if (cancelled) return;
        setLoaded({
          key,
          docs: collected,
          total: nextTotal,
          facets: nextFacets ?? loaded?.facets ?? {},
          domains: nextDomains ?? loaded?.domains ?? [],
        });
        setPage(searchAll ? 1 : initialPage);
      } catch (e) {
        if (!cancelled) {
          setFailure({ key, message: e instanceof Error ? e.message : "Не удалось загрузить документы." });
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, searchAll, buildParams, pageSize, initialPage]);

  // Показываем результат только если он относится к текущему ключу запроса.
  const current = loaded?.key === key ? loaded : null;
  const docs = useMemo(() => current?.docs ?? [], [current]);
  const total = current?.total ?? 0;
  const failed = failure?.key === key;

  const showMore = useCallback(async () => {
    if (!cfg.datasetId || loadingMore || searchAll || !current) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    setFailure(null);
    try {
      const data = await getDocuments(buildParams(nextPage, pageSize));
      if (data.error) throw new Error(data.error);
      setLoaded({
        ...current,
        docs: [...current.docs, ...(data.documents ?? [])],
        total: data.total ?? current.total,
      });
      setPage(nextPage);
      onPageChange?.(nextPage);
    } catch (e) {
      setFailure({ key, message: e instanceof Error ? e.message : "Не удалось загрузить документы." });
    } finally {
      setLoadingMore(false);
    }
  }, [cfg.datasetId, loadingMore, searchAll, current, page, buildParams, pageSize, onPageChange, key]);

  const documents = useMemo(
    () => (searchAll && q ? filterByTitle(docs, q, titleOf) : docs),
    [docs, q, searchAll, titleOf],
  );

  return {
    documents,
    loaded: docs.length,
    total,
    facets: current?.facets ?? {},
    domains: current?.domains ?? [],
    // Пока нет результата для текущего ключа запроса — грузим (в т.ч. первый рендер).
    loading: Boolean(cfg.datasetId) && !current && !failed,
    loadingMore,
    hasMore: !searchAll && docs.length < total,
    showMore,
    error: failed && failure ? failure.message : null,
  };
}
