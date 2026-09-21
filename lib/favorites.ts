// lib/favorites.ts — избранное статей в localStorage (ds_site#103): без сервера и cookie,
// работает и в Docker-режиме, и в статике GitHub Pages. Сохраняем только document_id.
// Запись — только после согласия пользователя (баннер); удалять можно всегда.

"use client";

import { useSyncExternalStore } from "react";
import { addFav, parseFavs, removeFav, type FavEntry } from "./favorites-core.mjs";

const FAV_KEY = "ds-favorites";
const CONSENT_KEY = "ds-storage-consent"; // "yes" | "no" | нет ключа = не спрашивали
const EVENT = "ds-storage-change";

export type Consent = "yes" | "no" | null;

const EMPTY: FavEntry[] = [];
let cache: { raw: string | null; val: FavEntry[] } = { raw: null, val: EMPTY };

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* localStorage недоступен (приватный режим и т.п.) — молча пропускаем */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function favSnapshot(): FavEntry[] {
  const raw = read(FAV_KEY);
  if (raw !== cache.raw) cache = { raw, val: raw ? parseFavs(raw) : EMPTY };
  return cache.val;
}

function consentSnapshot(): Consent {
  const v = read(CONSENT_KEY);
  return v === "yes" || v === "no" ? v : null;
}

export function useFavorites(): FavEntry[] {
  return useSyncExternalStore(subscribe, favSnapshot, () => EMPTY);
}

export function useIsFavorite(id: string): boolean {
  return useFavorites().some((e) => e.id === id);
}

// На сервере считаем, что согласие есть, чтобы баннер не мигал до гидратации.
export function useConsent(): Consent {
  return useSyncExternalStore(subscribe, consentSnapshot, () => "yes" as Consent);
}

export function setConsent(v: "yes" | "no") {
  write(CONSENT_KEY, v);
}

// Добавить/убрать. Без согласия добавление не выполняется, а баннер показывается снова.
export function toggleFavorite(id: string) {
  const list = favSnapshot();
  if (list.some((e) => e.id === id)) {
    write(FAV_KEY, JSON.stringify(removeFav(list, id)));
    return;
  }
  if (consentSnapshot() !== "yes") {
    write(CONSENT_KEY, null);
    return;
  }
  write(FAV_KEY, JSON.stringify(addFav(list, id)));
}
