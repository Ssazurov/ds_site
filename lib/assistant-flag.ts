// lib/assistant-flag.ts — флаг показа «Помощника» и URL внешнего GAR (ds_site#94, ADR-0018).
// Приоритет: если задан NEXT_PUBLIC_ASSISTANT_ENABLED (внешняя сборка) — он главный;
// иначе флаг берётся из localStorage (страница /settings). По умолчанию выключен.
"use client";

import { useEffect, useState } from "react";

const FLAG_KEY = "ds-assistant-enabled";
const GAR_URL_KEY = "ds-external-gar-url";
const CHANGE_EVENT = "ds-settings-change";

// Обращение к process.env.NEXT_PUBLIC_* должно быть буквальным — Next подставляет значение при сборке.
function parseEnv(raw: string | undefined): boolean | undefined {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return undefined;
}

const ENV_FLAG = parseEnv(process.env.NEXT_PUBLIC_ASSISTANT_ENABLED);

/** true, если флаг зафиксирован при сборке и /settings его не меняет. */
export const isAssistantFlagLocked = ENV_FLAG !== undefined;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null || value === "") window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* localStorage недоступен — настройка просто не сохранится */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function setAssistantEnabled(value: boolean) {
  write(FLAG_KEY, value ? "1" : "0");
}

export function setExternalGarUrl(url: string) {
  write(GAR_URL_KEY, url.trim().replace(/\/+$/, ""));
}

export function getExternalGarUrl(): string {
  return typeof window === "undefined" ? "" : read(GAR_URL_KEY) ?? "";
}

function useSetting<T>(compute: () => T, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const update = () => setValue(compute());
    update();
    window.addEventListener(CHANGE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(CHANGE_EVENT, update);
      window.removeEventListener("storage", update);
    };
    // compute — стабильные функции модуля
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

/** null — ещё не определено (SSR/гидратация); true/false — итоговое значение флага. */
export function useAssistantEnabled(): boolean | null {
  return useSetting<boolean | null>(
    () => (ENV_FLAG !== undefined ? ENV_FLAG : read(FLAG_KEY) === "1"),
    ENV_FLAG ?? null,
  );
}

export function useExternalGarUrl(): string {
  return useSetting<string>(getExternalGarUrl, "");
}
