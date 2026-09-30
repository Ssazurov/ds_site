// components/LoadMore.tsx
// Кнопка догрузки «Показать ещё» — единая для /articles, /news, /links,
// /glossary (ds_site#129, ADR-0025).

"use client";

type Props = {
  hasMore: boolean;
  loading?: boolean;
  onClick: () => void;
  /** подпись под счётчиком, например «Показано 20 из 126» */
  hint?: string | null;
};

export default function LoadMore({ hasMore, loading = false, onClick, hint }: Props) {
  if (!hasMore && !hint) return null;
  return (
    <div className="load-more">
      {hint && <p className="fb-total">{hint}</p>}
      {hasMore && (
        <button type="button" onClick={onClick} disabled={loading}>
          {loading ? "Загружаю..." : "Показать ещё"}
        </button>
      )}
    </div>
  );
}
