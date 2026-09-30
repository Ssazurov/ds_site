// lib/use-paged-list.ts
// Пагинация «Показать ещё» для списков, которые уже целиком лежат в памяти
// (глоссарий — ds_site#129, ADR-0025). Новый набор (фильтры/поиск/буква)
// возвращает список к первой порции; начальное число порций берётся из ?page=.

"use client";

import { useMemo, useState } from "react";
import { PAGE_SIZE } from "./pagination";

export type PagedList<T> = {
  visible: T[];
  shown: number;
  hasMore: boolean;
  showMore: () => void;
};

export function usePagedList<T>(items: T[], pageSize = PAGE_SIZE, initialPage = 1): PagedList<T> {
  // Состояние хранит ссылку на набор, для которого актуальна страница:
  // сменился набор (фильтры/поиск/буква) — снова первая порция.
  const [state, setState] = useState<{ items: T[]; initial: number; page: number }>({
    items, initial: initialPage, page: initialPage,
  });
  const page = state.items === items && state.initial === initialPage ? state.page : initialPage;

  const visible = useMemo(() => items.slice(0, page * pageSize), [items, page, pageSize]);

  return {
    visible,
    shown: visible.length,
    hasMore: visible.length < items.length,
    showMore: () => setState({ items, initial: initialPage, page: page + 1 }),
  };
}
