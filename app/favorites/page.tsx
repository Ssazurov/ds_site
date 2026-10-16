// app/favorites/page.tsx — «Избранное» (ds_site#103): статьи из localStorage.
// Фильтры по аналогии с /articles (тема, категория, возраст, аудитория, тег, период, сортировка, поиск
// по названию и описанию) считаются на клиенте по метаданным загруженных статей.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getDocumentDetail } from "@/lib/gar/data";
import type { DocumentDetail, FilterKey } from "@/lib/gar";
import { useMetadataLabels } from "@/lib/gar/labels";
import { docTags } from "@/lib/gar/tags";
import { useFavorites } from "@/lib/favorites";
import { sortNewestFirst, favFacets, applyFavFilters, EMPTY_FAV_FILTERS, type FavFilters } from "@/lib/favorites-core.mjs";
import { formatDate, metaReadingMinutes, readingLabel } from "@/lib/format";
import FavoriteButton from "@/components/FavoriteButton";
import FilterBar from "@/components/FilterBar";
import SortDateBar, { DateRangeFields, type SortBy, type SortDir } from "@/components/SortDateBar";

const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";
const SORT_FIELDS: { value: SortBy; label: string }[] = [
  { value: "created_at", label: "По дате добавления в избранное" },
  { value: "publish_date", label: "По дате публикации" },
  { value: "title", label: "По названию" },
];

function titleOf(doc: DocumentDetail) {
  return String(doc.metadata?.title || doc.doc_name);
}

export default function FavoritesPage() {
  const favs = useFavorites();
  const { ruLabel, tree } = useMetadataLabels(DATASET_ID);
  const [docs, setDocs] = useState<Record<string, DocumentDetail | null>>({});
  const [f, setF] = useState<FavFilters>(EMPTY_FAV_FILTERS);

  const sorted = useMemo(() => sortNewestFirst(favs), [favs]);
  const ids = useMemo(() => sorted.map((e) => e.id), [sorted]);

  useEffect(() => {
    const missing = ids.filter((id) => !(id in docs));
    if (!missing.length) return;
    let cancelled = false;
    Promise.all(
      missing.map((id) => getDocumentDetail(id).then((d) => [id, d] as const, () => [id, null] as const)),
    ).then((pairs) => {
      if (!cancelled) setDocs((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const items = useMemo(
    () =>
      sorted
        .filter((e) => docs[e.id] !== undefined)
        .map((e) => {
          const doc = docs[e.id];
          return { id: e.id, at: e.at, title: doc ? titleOf(doc) : e.id, meta: (doc?.metadata ?? {}) as Record<string, unknown>, ok: Boolean(doc) };
        }),
    [sorted, docs],
  );
  const facets = useMemo(() => favFacets(items), [items]);
  const shown = useMemo(() => applyFavFilters(items, f) as typeof items, [items, f]);
  const allLoaded = ids.length > 0 && items.length === ids.length;

  const patch = (p: Partial<FavFilters>) => setF((prev) => ({ ...prev, ...p }));
  const setFilter = (key: FilterKey, value: string) => {
    if (key === "doc_type") return;
    patch(key === "direction" && value !== f.direction ? { direction: value, category: "" } : { [key]: value });
  };
  const clearFilters = () => setF({ ...EMPTY_FAV_FILTERS, q: f.q, sortBy: f.sortBy, sortDir: f.sortDir });
  const dates = (p: { date_from?: string; date_to?: string }) =>
    patch({ ...(p.date_from !== undefined && { dateFrom: p.date_from }), ...(p.date_to !== undefined && { dateTo: p.date_to }) });

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <h1>Избранное</h1>
      </header>
      <section className="chat-panel" aria-label="Избранные статьи">
        <p className="fb-total">Список хранится в этом браузере и не переносится на другие устройства.</p>
        {ids.length > 0 && (
          <>
            <FilterBar
              values={{ direction: f.direction, category: f.category, age: f.age, target_audience: f.target_audience }}
              facets={facets}
              ruLabel={ruLabel}
              onChange={setFilter}
              onClear={clearFilters}
              tree={tree}
              titleQuery={f.q}
              onTitleQuery={(q) => patch({ q })}
              hide={["doc_type"]}
              primaryFilters
              extraCount={(f.dateFrom ? 1 : 0) + (f.dateTo ? 1 : 0) + (f.tag ? 1 : 0)}
            >
              <DateRangeFields dateFrom={f.dateFrom} dateTo={f.dateTo} onChange={dates} />
              {facets.tag.length > 0 && (
                <div>
                  <p className="fb-lab">Тег</p>
                  <select className="fb-select" aria-label="Тег" value={f.tag} onChange={(e) => patch({ tag: e.target.value })}>
                    <option value="">Все</option>
                    {facets.tag.map((t) => <option key={t} value={t}>#{t}</option>)}
                  </select>
                </div>
              )}
            </FilterBar>
            <SortDateBar
              dateFrom={f.dateFrom}
              dateTo={f.dateTo}
              sortBy={f.sortBy as SortBy}
              sortDir={f.sortDir as SortDir}
              fields={SORT_FIELDS}
              hideDates
              onChange={(p) => patch({ ...(p.sort_by && { sortBy: p.sort_by }), ...(p.sort_dir && { sortDir: p.sort_dir }) })}
            />
            {allLoaded && <p className="fb-total">Показано: {shown.length} из {ids.length}</p>}
          </>
        )}
        {ids.length === 0 && (
          <p className="message">
            Пока пусто. Нажмите ☆ у статьи в разделе <Link href="/articles">«Статьи»</Link>.
          </p>
        )}
        {ids.length > 0 && !allLoaded && <p className="message">Загружаю...</p>}
        {allLoaded && shown.length === 0 && <p className="message">Ничего не найдено по выбранным фильтрам.</p>}
        <div className="source-grid">
          {shown.map(({ id, title, meta, ok }) => {
            const dirValue = typeof meta.direction === "string" ? meta.direction : "";
            const cat = typeof meta.category === "string" && meta.category ? ruLabel("category", meta.category) : null;
            const mins = metaReadingMinutes(meta);
            const when = [formatDate(meta.publish_date), mins ? readingLabel(mins) : null].filter(Boolean).join(" · ");
            return (
              <article className="source-card" key={id}>
                <div className="card-head">
                  {dirValue ? (
                    <button type="button" className="tag" onClick={() => patch({ direction: dirValue, category: "" })}>
                      {ruLabel("direction", dirValue) ?? dirValue}
                    </button>
                  ) : <span />}
                  <FavoriteButton id={id} title={title} />
                </div>
                {cat && <p className="card-cat">{cat}</p>}
                <h2>{ok ? <Link href={`/articles/${id}`}>{title}</Link> : "Статья недоступна"}</h2>
                {docTags(meta).length > 0 && (
                  <div className="tag-chips">
                    {docTags(meta).map((t) => (
                      <button key={t} type="button" className="tag tag-chip" onClick={() => patch({ tag: t })}>#{t}</button>
                    ))}
                  </div>
                )}
                {when && <div className="card-foot"><span>{when}</span></div>}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
