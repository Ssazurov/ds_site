// lib/gar/data.ts — единая точка чтения данных для страниц (ds_site#93, ADR-0018).
// Внутренний режим: как раньше, через /api/gar/* (прокси к GAR).
// Внешний статический режим (NEXT_PUBLIC_STATIC_EXPORT=1): JSON из /data/*.json
// (его готовят scripts/export-content.mjs + prepare-static.mjs); фильтры, пагинация
// и поиск (MiniSearch, индекс строится в браузере) — на клиенте.
import type { DocumentDetail, DocumentSummary, DocumentsResponse, MetadataLabels } from "./types";

export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
// Буквальное обращение к process.env.NEXT_PUBLIC_* — Next подставляет значение при сборке.
export const DATA_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data`;

type Coll = "articles" | "news" | "glossary" | "links";
const COLLS: Coll[] = ["articles", "news", "glossary", "links"];

type Rec = {
  document_id: string;
  doc_name?: string;
  title: string;
  summary: string;
  source_url: string | null;
  has_full_text?: boolean;
  metadata: Record<string, unknown>;
};

const FILTER_KEYS = ["direction", "category", "age", "target_audience"] as const;

function collFor(docType: string): Coll {
  if (docType === "news") return "news";
  if (docType === "link") return "links";
  if (docType.startsWith("glossary")) return "glossary";
  return "articles";
}

const loaded = new Map<Coll, Promise<Rec[]>>();
function load(c: Coll): Promise<Rec[]> {
  let p = loaded.get(c);
  if (!p) {
    p = fetch(`${DATA_BASE}/${c}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Данные недоступны (${c}: HTTP ${r.status})`);
        return r.json();
      })
      .then((d) => (d.items ?? []) as Rec[]);
    p.catch(() => loaded.delete(c));
    loaded.set(c, p);
  }
  return p;
}

function toSummary(r: Rec): DocumentSummary {
  return {
    document_id: r.document_id,
    doc_name: r.doc_name ?? r.title,
    metadata: { ...r.metadata, title: r.title, description: r.summary, source_url: r.source_url ?? undefined },
  };
}

// --- поиск (MiniSearch) -----------------------------------------------------
const norm = (t: string) => t.toLowerCase().replace(/ё/g, "е");

type Index = { search: (q: string) => { id: string }[] };
const indexes = new Map<Coll, Promise<Index>>();
function index(c: Coll): Promise<Index> {
  let p = indexes.get(c);
  if (!p) {
    p = Promise.all([import("minisearch"), load(c)]).then(([{ default: MiniSearch }, recs]) => {
      const ms = new MiniSearch({
        fields: ["title", "summary", "tags"],
        processTerm: (t) => norm(t),
        searchOptions: { prefix: true, fuzzy: 0.2, combineWith: "AND", boost: { title: 3 } },
      });
      ms.addAll(recs.map((r) => ({
        id: r.document_id, title: r.title, summary: r.summary,
        tags: ([] as unknown[]).concat(r.metadata.tags ?? []).join(" "),
      })));
      return ms as unknown as Index;
    });
    indexes.set(c, p);
  }
  return p;
}

/** id документов коллекции, найденных по запросу (в порядке релевантности). */
export async function searchCollection(c: Coll, q: string): Promise<string[]> {
  return (await index(c)).search(q.trim()).map((h) => h.id);
}

// --- список ----------------------------------------------------------------
const byDateDesc = (a: Rec, b: Rec) =>
  String(b.metadata.publish_date ?? "").localeCompare(String(a.metadata.publish_date ?? "")) ||
  a.title.localeCompare(b.title, "ru");

function has(r: Rec, k: string, v: string) {
  const x = r.metadata[k];
  return Array.isArray(x) ? x.includes(v) : x === v;
}

async function staticDocuments(p: URLSearchParams): Promise<DocumentsResponse> {
  const docType = p.get("doc_type") ?? "article";
  const c = collFor(docType);
  let recs = await load(c);
  if (c === "glossary") recs = recs.filter((r) => r.metadata.doc_type === docType);
  const q = (p.get("q") ?? "").trim();
  let pool: Rec[];
  if (q) {
    const byId = new Map(recs.map((r) => [r.document_id, r]));
    pool = (await searchCollection(c, q)).map((id) => byId.get(id)).filter((r): r is Rec => !!r);
  } else {
    pool = [...recs].sort(byDateDesc);
  }
  const sel = Object.fromEntries(FILTER_KEYS.map((k) => [k, p.get(k) || ""]));
  const matching = (skip?: string) =>
    pool.filter((r) => FILTER_KEYS.every((k) => k === skip || !sel[k] || has(r, k, sel[k])));
  const facets: Record<string, string[]> = {};
  for (const k of FILTER_KEYS) {
    const values = new Set<string>();
    for (const r of matching(k)) {
      for (const v of ([] as unknown[]).concat(r.metadata[k] ?? [])) if (typeof v === "string" && v) values.add(v);
    }
    facets[k] = [...values].sort();
  }
  const list = matching();
  const per = Number(p.get("per_page")) || 20;
  const page = Number(p.get("page")) || 1;
  return { documents: list.slice((page - 1) * per, page * per).map(toSummary), total: list.length, facets };
}

export async function getDocuments(params: URLSearchParams): Promise<DocumentsResponse> {
  if (IS_STATIC) return staticDocuments(params);
  const res = await fetch(`/api/gar/documents?${params.toString()}`);
  return (await res.json()) as DocumentsResponse;
}

// --- карточка --------------------------------------------------------------
async function findRec(id: string): Promise<{ rec: Rec; coll: Coll } | null> {
  for (const coll of COLLS) {
    const rec = (await load(coll)).find((r) => r.document_id === id);
    if (rec) return { rec, coll };
  }
  return null;
}

export async function getDocumentDetail(id: string): Promise<DocumentDetail> {
  if (IS_STATIC) {
    const f = await findRec(id);
    if (!f) throw new Error("Материал не найден.");
    const s = toSummary(f.rec);
    return { ...s, assets: { canonical_md: { available: !!f.rec.has_full_text } } };
  }
  const res = await fetch(`/api/gar/documents/${id}`);
  const data = (await res.json()) as DocumentDetail;
  if (!res.ok || data.error) throw new Error(data.error || "Материал не найден.");
  return data;
}

/** Полный текст (markdown) или null, если недоступен. */
export async function getDocumentContent(id: string): Promise<string | null> {
  if (IS_STATIC) {
    const f = await findRec(id);
    if (!f?.rec.has_full_text) return null;
    const res = await fetch(`${DATA_BASE}/${f.coll}/${id}.json`);
    return res.ok ? ((await res.json()).full_text as string) : null;
  }
  const res = await fetch(`/api/gar/documents/${id}/content`);
  return res.ok ? await res.text() : null;
}

/** Краткое содержание (только статический режим; иначе пустая строка). */
export async function getStaticSummary(id: string): Promise<string> {
  return IS_STATIC ? (await findRec(id))?.rec.summary ?? "" : "";
}

/** Словарь value -> русская подпись (static: /data/labels.json). */
export async function getLabels(datasetId: string): Promise<MetadataLabels | null> {
  const res = await fetch(IS_STATIC ? `${DATA_BASE}/labels.json` : `/api/gar/metadata-fields?dataset_id=${datasetId}`);
  return res.ok ? ((await res.json()) as MetadataLabels) : null;
}
