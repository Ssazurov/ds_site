// lib/format.ts
// Форматирование для карточек (ds_site#85): дата без года для текущего года,
// время чтения (~200 слов/мин, округление вверх).

export function formatDate(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("ru-RU", opts).replace(/\s?г\.$/, "");
}

const WORDS_PER_MIN = 200;

/** Минуты чтения по тексту статьи. */
export function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MIN));
}

/** Минуты чтения из метаданных (reading_time_min или word_count), если есть. */
export function metaReadingMinutes(meta?: Record<string, unknown>): number | null {
  const m = Number(meta?.reading_time_min);
  if (Number.isFinite(m) && m > 0) return Math.ceil(m);
  const w = Number(meta?.word_count);
  if (Number.isFinite(w) && w > 0) return Math.max(1, Math.ceil(w / WORDS_PER_MIN));
  return null;
}

export const readingLabel = (min: number) => `${min} мин чтения`;
