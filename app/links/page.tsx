// app/links/page.tsx
// Раздел "Библиотека" -> "Ссылки": из pull-sync кэша (scripts/sync-glossary-links.mjs,
// ADR-0004 п.3, issue #8) вместо live-запросов к gar-core-api.
// Только внешние ресурсы (doc_type=link) — термины/сокращения глоссария
// живут отдельно на /glossary (ds_site#46).
// Карточка ресурса + структура страницы (без eyebrow/lede, фильтры + сброс) —
// по образцу /articles (ds_site#53). Поле "теги" в карточке не показывается:
// в ResourceLinkRecord (lib/gar/glossary-links-cache.ts) такого поля нет —
// нужна отдельная задача с ADR на расширение контракта (см. также ds_site#52).

"use client";

import { useEffect, useMemo, useState } from "react";
import type { GlossaryLinksCache, ResourceLinkRecord } from "@/lib/gar/glossary-links-cache";
import { useMetadataLabels } from "@/lib/gar/labels";
import type { FilterKey } from "@/lib/gar";

const FILTER_LABELS: Record<Exclude<FilterKey, "doc_type">, string> = {
  direction: "Направление",
  category: "Категория",
  age: "Возраст",
  target_audience: "Аудитория",
};

const OTHER_FILTERS = Object.keys(FILTER_LABELS) as Exclude<FilterKey, "doc_type">[];

const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";

function linkFacetValue(link: ResourceLinkRecord, key: Exclude<FilterKey, "doc_type">) {
  return key === "age" ? link.age_group : link[key];
}

const clip = (t: string, n = 32) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

export default function LinksPage() {
  const { ruLabel } = useMetadataLabels(DATASET_ID);
  const [filters, setFilters] = useState<Record<Exclude<FilterKey, "doc_type">, string>>({
    direction: "", category: "", age: "", target_audience: "",
  });
  const [cache, setCache] = useState<GlossaryLinksCache | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/glossary-links")
      .then((res) => res.json())
      .then((data: GlossaryLinksCache) => {
        if (!cancelled) setCache(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить ссылки.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const links = useMemo(
    () => cache?.links.filter((l) => l.status === "active" && l.doc_type === "link") ?? [],
    [cache],
  );

  const facets = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const key of OTHER_FILTERS) {
      result[key] = [...new Set(links.map((l) => linkFacetValue(l, key)).filter((v): v is string => !!v))].sort();
    }
    return result;
  }, [links]);

  const filtered = useMemo(() => {
    return links.filter((l) => OTHER_FILTERS.every((key) => !filters[key] || linkFacetValue(l, key) === filters[key]));
  }, [links, filters]);

  function setFilter(key: Exclude<FilterKey, "doc_type">, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({ direction: "", category: "", age: "", target_audience: "" });
  }

  const hasActiveFilters = OTHER_FILTERS.some((key) => filters[key]);

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <h1>Ссылки</h1>
      </header>

      <section className="chat-panel" aria-label="Фильтры и список ссылок">
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1rem" }}>
          <fieldset className="response-mode" aria-label="Фильтры" disabled={loading} style={{ flex: 1 }}>
            {OTHER_FILTERS.map((key) => (
              <select
                key={key}
                value={filters[key]}
                onChange={(event) => setFilter(key, event.target.value)}
                aria-label={FILTER_LABELS[key]}
                title={filters[key] ? ruLabel(key, filters[key]) || undefined : undefined}
              >
                <option value="">{FILTER_LABELS[key]}: все</option>
                {(facets[key] || []).map((value) => (
                  <option key={value} value={value} title={ruLabel(key, value) ?? value}>{clip(ruLabel(key, value) ?? value)}</option>
                ))}
              </select>
            ))}
          </fieldset>
          <button type="button" onClick={clearFilters} disabled={loading || !hasActiveFilters}>Сбросить фильтры</button>
        </div>

        {error && <p className="message error" role="alert">{error}</p>}
        {loading && <p className="message">Загружаю...</p>}

        {!loading && !error && cache && !cache.syncedAt && (
          <p className="message">Синк ещё не запускался — данных пока нет.</p>
        )}

        {!loading && !error && cache?.syncedAt && filtered.length === 0 && (
          <p className="message">Ничего не найдено по выбранным фильтрам.</p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="source-grid">
            {filtered.map((link) => (
              <article className="source-card" key={link.id}>
                <h2>{link.name}</h2>
                <p>
                  {[ruLabel("direction", link.direction), ruLabel("category", link.category), ruLabel("target_audience", link.target_audience)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {link.description && <p>{link.description}</p>}
                {link.url ? (
                  <a href={link.url} target="_blank" rel="noreferrer" className="source-link">
                    Перейти к ресурсу <span aria-hidden="true">↗</span>
                  </a>
                ) : <span className="no-link">Ссылка недоступна</span>}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
