// app/glossary/page.tsx
// Раздел "Глоссарий": документы doc_type=glossary_term|glossary_abb из GAR
// напрямую (ADR-0016, issue #77); определение подгружается при раскрытии.
// ds_site#129 (ADR-0025): набор терминов небольшой и нужен целиком для
// счётчиков алфавитного указателя, поэтому грузится один раз, а показывается
// порциями по 20 («Показать ещё», ?page= в URL) с группировкой по буквам и
// указателем А-Я; ?letter= в URL переключает выбранную букву.

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchAllDocuments, metaStr } from "@/lib/gar/documents-by-type";
import { getDocumentContent, getStaticSummary, IS_STATIC, searchCollection } from "@/lib/gar/data";
import { SearchInput } from "@/components/SearchBox";
import LoadMore from "@/components/LoadMore";
import { useMetadataLabels } from "@/lib/gar/labels";
import type { DocumentSummary, FilterKey } from "@/lib/gar";
import FilterBar from "@/components/FilterBar";
import { PAGE_SIZE, pageParam, withPageParam } from "@/lib/pagination";
import { replaceQuery } from "@/lib/url-state";
import { usePagedList } from "@/lib/use-paged-list";

const FILTER_LABELS: Record<Exclude<FilterKey, "doc_type">, string> = {
  direction: "Направление",
  category: "Категория",
  age: "Возраст",
  target_audience: "Аудитория",
};
const FILTER_ORDER = Object.keys(FILTER_LABELS) as Exclude<FilterKey, "doc_type">[];

const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";

// Русский алфавит + «#» для терминов, начинающихся не с буквы.
const LETTERS = [..."абвгдеёжзийклмнопрстуфхцчшщъыьэюя"];

function letterOf(name: string): string {
  const ch = name.trim().charAt(0).toLowerCase();
  return LETTERS.includes(ch) ? ch.toUpperCase() : "#";
}

function termFacetValue(term: DocumentSummary, key: Exclude<FilterKey, "doc_type">) {
  return metaStr(term, key);
}

function TermCard({ term, ruLabel }: { term: DocumentSummary; ruLabel: (k: FilterKey, v: unknown) => string | null }) {
  const [open, setOpen] = useState(false);
  const [definition, setDefinition] = useState<string | null>(null);
  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && definition === null) {
      try {
        const text = await getDocumentContent(term.document_id);
        setDefinition(text ?? (await getStaticSummary(term.document_id)));
      } catch {
        setDefinition("");
      }
    }
  }
  const dir = ruLabel("direction", metaStr(term, "direction"));
  const cat = ruLabel("category", metaStr(term, "category"));
  const kind = ruLabel("doc_type", metaStr(term, "doc_type"));
  const src = metaStr(term, "source_url");
  return (
    <article className="source-card">
      {dir && <span className="tag">{dir}</span>}
      {cat && <p className="card-cat">{cat}</p>}
      <h2>{term.doc_name}</h2>
      {open && <p style={{ whiteSpace: "pre-line" }}>{definition === null ? "Загружаю..." : definition || "Определение недоступно."}</p>}
      <div className="card-foot">
        <span>{kind}{IS_STATIC && src && (<> · <a href={src} target="_blank" rel="noreferrer">Источник ↗</a></>)}</span>
        <button type="button" onClick={toggle} className="fb-link" aria-expanded={open}>
          {open ? "Скрыть определение" : "Показать определение"}
        </button>
      </div>
    </article>
  );
}

function GlossaryContent() {
  const searchParams = useSearchParams();
  const { ruLabel } = useMetadataLabels(DATASET_ID);
  const [filters, setFilters] = useState<Record<Exclude<FilterKey, "doc_type">, string>>({
    direction: "", category: "", age: "", target_audience: "",
  });
  const [docType, setDocType] = useState(""); // "" = термины + сокращения
  const [terms, setTerms] = useState<DocumentSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [qIds, setQIds] = useState<Set<string> | null>(null);
  const letter = (searchParams.get("letter") || "").toUpperCase();

  useEffect(() => {
    if (!IS_STATIC || !q.trim()) return;
    let cancelled = false;
    searchCollection("glossary", q).then((ids) => { if (!cancelled) setQIds(new Set(ids)); }).catch(() => {});
    return () => { cancelled = true; };
  }, [q]);
  const activeIds = IS_STATIC && q.trim() ? qIds : null;
  const loading = !loaded && !error;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchAllDocuments(DATASET_ID, "glossary_term"),
      fetchAllDocuments(DATASET_ID, "glossary_abb"),
    ])
      .then(([a, b]) => {
        if (!cancelled) setTerms([...a, ...b]);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить глоссарий.");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const facets = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const key of FILTER_ORDER) {
      result[key] = [...new Set(terms.map((t) => termFacetValue(t, key)).filter((v): v is string => !!v))].sort();
    }
    return result;
  }, [terms]);

  const matched = useMemo(() => {
    return terms
      .filter((t) => !docType || metaStr(t, "doc_type") === docType)
      .filter((t) => !activeIds || activeIds.has(t.document_id))
      .filter((t) => FILTER_ORDER.every((key) => !filters[key] || termFacetValue(t, key) === filters[key]))
      .sort((a, b) => a.doc_name.localeCompare(b.doc_name, "ru"));
  }, [terms, docType, filters, activeIds]);

  // Алфавитный указатель: счётчики по всему отфильтрованному набору.
  const letterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of matched) {
      const l = letterOf(t.doc_name);
      counts.set(l, (counts.get(l) ?? 0) + 1);
    }
    return counts;
  }, [matched]);

  const filtered = useMemo(
    () => (letter ? matched.filter((t) => letterOf(t.doc_name) === letter) : matched),
    [matched, letter],
  );

  const { visible, shown, hasMore, showMore } = usePagedList(filtered, undefined, pageParam(searchParams));

  // Порциями по буквам: сначала все «А», потом «Б» и т.д.
  const groups = useMemo(() => {
    const out: { letter: string; items: DocumentSummary[] }[] = [];
    for (const term of visible) {
      const l = letterOf(term.doc_name);
      const last = out[out.length - 1];
      if (last && last.letter === l) last.items.push(term);
      else out.push({ letter: l, items: [term] });
    }
    return out;
  }, [visible]);

  function setLetter(l: string) {
    const params = new URLSearchParams(searchParams.toString());
    const next = letter === l ? "" : l;
    if (next) params.set("letter", next);
    else params.delete("letter");
    params.delete("page"); // новая буква — снова первая порция
    replaceQuery(params);
  }

  function showMoreTerms() {
    const nextPage = Math.floor(shown / PAGE_SIZE) + 1;
    showMore();
    replaceQuery(withPageParam(searchParams, nextPage));
  }

  function setFilter(key: FilterKey, value: string) {
    if (key === "doc_type") return; // glossary не использует doc_type в filters
    setFilters((prev) => ({ ...prev, [key]: value, ...(key === "direction" && value !== prev.direction ? { category: "" } : {}) }));
  }

  function clearFilters() {
    setFilters({ direction: "", category: "", age: "", target_audience: "" });
    setDocType("");
    setQ("");
    replaceQuery(new URLSearchParams());
  }

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <h1>Глоссарий</h1>
      </header>

      <section className="chat-panel" aria-label="Фильтры и список терминов">
        {IS_STATIC && <SearchInput value={q} onChange={setQ} placeholder="Поиск по глоссарию" />}
        <div className="fb-chips" role="group" aria-label="Тип">
          {([["glossary_term", "Термины"], ["glossary_abb", "Сокращения"]] as const).map(([v, l]) => (
            <button key={v} type="button" className={`fb-chip${docType === v ? " on" : ""}`} aria-pressed={docType === v} disabled={loading} onClick={() => setDocType(docType === v ? "" : v)}>{l}</button>
          ))}
        </div>
        <FilterBar values={filters} facets={facets} ruLabel={ruLabel} onChange={setFilter} onClear={clearFilters} disabled={loading} />

        {letterCounts.size > 0 && (
          <div className="az-index" role="group" aria-label="Алфавитный указатель">
            {LETTERS.map((l) => {
              const key = l.toUpperCase();
              const count = letterCounts.get(key) ?? 0;
              if (!count) return null;
              return (
                <button
                  key={key}
                  type="button"
                  className={letter === key ? "on" : ""}
                  aria-pressed={letter === key}
                  title={`${key}: ${count}`}
                  onClick={() => setLetter(key)}
                >
                  {key}
                </button>
              );
            })}
            {!!letterCounts.get("#") && (
              <button
                type="button"
                className={letter === "#" ? "on" : ""}
                aria-pressed={letter === "#"}
                title={`Прочие: ${letterCounts.get("#")}`}
                onClick={() => setLetter("#")}
              >
                #
              </button>
            )}
            {letter && (
              <button type="button" onClick={() => setLetter(letter)} title="Показать все буквы">
                Все
              </button>
            )}
          </div>
        )}

        {error && <p className="message error" role="alert">{error}</p>}
        {loading && <p className="message">Загружаю...</p>}

        {!loading && !error && filtered.length === 0 && (
          <p className="message">Ничего не найдено по выбранным фильтрам.</p>
        )}

        {!loading && visible.length > 0 && (
          <>
            {groups.map((g) => (
              <div className="az-group" key={g.letter}>
                <h2>{g.letter}</h2>
                <div className="source-grid">
                  {g.items.map((term) => (
                    <TermCard key={term.document_id} term={term} ruLabel={ruLabel} />
                  ))}
                </div>
              </div>
            ))}

            <LoadMore
              hasMore={hasMore}
              loading={loading}
              onClick={showMoreTerms}
              hint={`Показано: ${shown} из ${filtered.length}`}
            />
          </>
        )}
      </section>
    </main>
  );
}

export default function GlossaryPage() {
  return (
    <Suspense fallback={<div className="chat-shell"><p className="message">Загружаю...</p></div>}>
      <GlossaryContent />
    </Suspense>
  );
}
