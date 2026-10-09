// components/WordCard.tsx
// Карточка слова в каталоге (ds_site#27): картинка/заглушка + подпись + чекбокс выбора.
import { imageSrc, type Word } from "@/lib/words";

type Props = { word: Word; selected: boolean; onToggle: (id: string) => void };

export default function WordCard({ word, selected, onToggle }: Props) {
  const src = imageSrc(word);
  return (
    <label className={`source-card word-card${selected ? " selected" : ""}`}>
      <input
        type="checkbox"
        className="word-card-check"
        checked={selected}
        onChange={() => onToggle(word.id)}
        aria-label={`Выбрать «${word.lemma}» для печати`}
      />
      <span className="word-card-img">
        {src ? <img src={src} alt={word.lemma} loading="lazy" /> : <span className="word-card-noimg" aria-hidden="true">{word.lemma[0]?.toUpperCase()}</span>}
      </span>
      <span className="word-card-lemma">{word.lemma}</span>
      <span className="tag card-cat">{word.categoryLabel}</span>
    </label>
  );
}
