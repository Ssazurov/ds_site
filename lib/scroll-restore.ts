// lib/scroll-restore.ts
// Восстановление позиции прокрутки списков (/articles, /news, /links) при
// возврате «Назад» из статьи/новости (ds_site#167). Позиция пишется в
// sessionStorage на размонтировании списка; восстанавливается только при
// навигации назад/вперёд (popstate), когда карточки уже загружены.

"use client";

import { useLayoutEffect, useEffect, useRef } from "react";

const PREFIX = "ds-scroll:";

// Флаг ставится при popstate (раньше монтирования страницы) и снимается списком.
let popped = false;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    popped = true;
  });
}

function storageKey() {
  const params = new URLSearchParams(window.location.search);
  params.delete("page");
  const qs = params.toString();
  return PREFIX + window.location.pathname + (qs ? `?${qs}` : "");
}

/** ready — список отрисован (loading=false и есть карточки). */
export function useScrollRestore(ready: boolean) {
  const restore = useRef<boolean | null>(null);
  if (restore.current === null) {
    restore.current = popped;
    popped = false;
  }
  const lastY = useRef(0);
  const key = useRef("");

  useLayoutEffect(() => {
    key.current = storageKey();
    const onScroll = () => {
      lastY.current = window.scrollY;
      key.current = storageKey();
    };
    const save = () => {
      try {
        if (key.current) sessionStorage.setItem(key.current, String(lastY.current));
      } catch {
        /* sessionStorage недоступен */
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, []);

  useEffect(() => {
    if (!ready || !restore.current) return;
    restore.current = false;
    let y = 0;
    try {
      y = Number(sessionStorage.getItem(storageKey())) || 0;
    } catch {
      /* ignore */
    }
    if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
  }, [ready]);
}
