// lib/title-search.ts
// Общая логика поиска по названию для /news и /articles (ds_site#116/#119):
// префикс слова, без учёта регистра и ё. GAR не принимает q — фильтруем на клиенте.

import type { DocumentSummary } from "@/lib/gar";

export const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").trim();

export function matchesTitle(title: string, q: string): boolean {
  const words = norm(title).split(/[^\p{L}\p{N}]+/u);
  return norm(q).split(/\s+/).filter(Boolean).every((t) => words.some((w) => w.startsWith(t)));
}

export function filterByTitle(
  docs: DocumentSummary[],
  q: string,
  getTitle: (d: DocumentSummary) => string,
): DocumentSummary[] {
  return q ? docs.filter((d) => matchesTitle(getTitle(d), q)) : docs;
}
