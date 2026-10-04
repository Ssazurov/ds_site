// components/TagFilterNotice.tsx — активный фильтр по тегу с кнопкой сброса (ds_site#138).

type Props = { tag: string; onClear: () => void; disabled?: boolean };

export default function TagFilterNotice({ tag, onClear, disabled }: Props) {
  if (!tag) return null;
  return (
    <p className="fb-total">
      Тег: <strong>#{tag}</strong>{" "}
      <button type="button" onClick={onClear} disabled={disabled} aria-label={`Сбросить тег ${tag}`}>
        ✕ Сбросить
      </button>
    </p>
  );
}
