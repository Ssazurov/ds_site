// Читает локальный pull-синк кэш (scripts/sync-glossary-links.mjs, ADR-0004
// п.3). Server-only: используется в app/api/glossary-links/route.ts.
// Если кэша ещё нет (синк не запускался) — возвращает пустой снимок, а не
// ошибку: сайт должен оставаться read-only-доступным без gar-core-api.

import { readFile } from "node:fs/promises";
import path from "node:path";

export interface GlossaryTermRecord {
  id: string;
  term: string;
  term_en?: string | null;
  definition?: string | null;
  direction?: string | null;
  category?: string | null;
  doc_type?: string | null;
  target_audience?: string | null;
  age_group?: string | null;
  app_type?: string | null;
  status: string;
}

export interface ResourceLinkRecord {
  id: string;
  name: string;
  url: string;
  description?: string | null;
  region?: string | null;
  direction?: string | null;
  category?: string | null;
  doc_type?: string | null;
  target_audience?: string | null;
  age_group?: string | null;
  relevance?: string | null;
  app_type?: string | null;
  status: string;
}

export interface GlossaryLinksCache {
  syncedAt: string | null;
  terms: GlossaryTermRecord[];
  links: ResourceLinkRecord[];
}

const CACHE_PATH = path.join(process.cwd(), "data", "glossary-links-cache.json");

export async function readGlossaryLinksCache(): Promise<GlossaryLinksCache> {
  try {
    const raw = await readFile(CACHE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      syncedAt: parsed.syncedAt ?? null,
      terms: parsed.terms ?? [],
      links: parsed.links ?? [],
    };
  } catch {
    // Синк ещё не запускался — не ошибка, пустой снимок.
    return { syncedAt: null, terms: [], links: [] };
  }
}
