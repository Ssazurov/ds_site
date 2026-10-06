// components/SortDateBar.tsx — всегда видимая строка: период дат публикации
// (date_from/date_to) и сортировка по выбранному полю с направлением.
// Стили — классы fb-* + fb-sort (globals.css).

"use client";

export type SortBy = "publish_date" | "title" | "created_at";
export type SortDir = "asc" | "desc";
export const SORT_FIELDS: { value: SortBy; label: string }[] = [
  { value: "publish_date", label: "Дата публикации" },
  { value: "created_at", label: "Дата добавления" },
  { value: "title", label: "Название" },
];
export const DEFAULT_SORT: { by: SortBy; dir: SortDir } = { by: "publish_date", dir: "desc" };

type Props = {
  dateFrom: string;
  dateTo: string;
  sortBy: SortBy;
  sortDir: SortDir;
  onChange: (patch: Partial<{ date_from: string; date_to: string; sort_by: SortBy; sort_dir: SortDir }>) => void;
  disabled?: boolean;
};

export default function SortDateBar({ dateFrom, dateTo, sortBy, sortDir, onChange, disabled }: Props) {
  return (
    <div className="fb-sort" role="group" aria-label="Период и сортировка">
      <label>
        <span className="fb-lab">Период с</span>
        <input type="date" value={dateFrom} max={dateTo || undefined} disabled={disabled}
          onChange={(e) => onChange({ date_from: e.target.value })} />
      </label>
      <label>
        <span className="fb-lab">по</span>
        <input type="date" value={dateTo} min={dateFrom || undefined} disabled={disabled}
          onChange={(e) => onChange({ date_to: e.target.value })} />
      </label>
      <label>
        <span className="fb-lab">Сортировка</span>
        <select className="fb-select" value={sortBy} disabled={disabled}
          onChange={(e) => onChange({ sort_by: e.target.value as SortBy })}>
          {SORT_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </label>
      <button type="button" className="fb-chip" disabled={disabled}
        aria-label={sortDir === "asc" ? "По возрастанию" : "По убыванию"}
        title={sortDir === "asc" ? "По возрастанию (нажмите: по убыванию)" : "По убыванию (нажмите: по возрастанию)"}
        onClick={() => onChange({ sort_dir: sortDir === "asc" ? "desc" : "asc" })}>
        {sortDir === "asc" ? "↑ по возрастанию" : "↓ по убыванию"}
      </button>
      {(dateFrom || dateTo) && (
        <button type="button" className="fb-link" disabled={disabled}
          onClick={() => onChange({ date_from: "", date_to: "" })}>Сбросить даты</button>
      )}
    </div>
  );
}
