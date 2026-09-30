// lib/pagination.ts
// Общие константы накопительной пагинации «Показать ещё» (ds_site#129):
// размер страницы и разбор ?page=. Номера страниц нет — ?page= хранит
// количество уже загруженных порций, чтобы возврат из карточки не терял позицию.

/** Порция документов на страницу — единая для всех разделов (ds_site#129). */
export const PAGE_SIZE = 20;

/** GAR отдаёт максимум 100 документов за запрос (routers/public.py, per_page <= 100). */
export const MAX_PER_REQUEST = 100;

/** Верхняя граница числа порций из ?page= (защита от ?page=9999). */
export const MAX_PAGES = 50;

/** Число загруженных порций из URL; 1 при отсутствии/мусоре в параметре. */
export function pageParam(searchParams: URLSearchParams): number {
  const n = Number(searchParams.get("page") || "1");
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), MAX_PAGES);
}

/** Копия параметров с ?page= (удаляется, если значение равно 1). */
export function withPageParam(params: URLSearchParams, page: number): URLSearchParams {
  const next = new URLSearchParams(params);
  if (page > 1) next.set("page", String(page));
  else next.delete("page");
  return next;
}
