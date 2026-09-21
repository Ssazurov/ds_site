"use client";

import { toggleFavorite, useIsFavorite } from "@/lib/favorites";

export default function FavoriteButton({ id, title }: { id: string; title: string }) {
  const fav = useIsFavorite(id);
  const label = fav ? `Убрать «${title}» из избранного` : `Добавить «${title}» в избранное`;
  return (
    <button
      type="button"
      className={`fav-btn${fav ? " on" : ""}`}
      aria-pressed={fav}
      aria-label={label}
      title={fav ? "Убрать из избранного" : "В избранное"}
      onClick={() => toggleFavorite(id)}
    >
      <span aria-hidden="true">{fav ? "★" : "☆"}</span>
    </button>
  );
}
