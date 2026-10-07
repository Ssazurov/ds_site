"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useConsent } from "@/lib/favorites";

// Только внешний статический сайт (#179). Грузится после согласия в ConsentBanner.
const ENABLED = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
const YM_ID = Number(process.env.NEXT_PUBLIC_YM_ID ?? "113510062");
const CONSENT_KEY = "ds-storage-consent";

type YM = ((...a: unknown[]) => void) & { a?: unknown[][]; l?: number };
declare global {
  interface Window {
    ym?: YM;
  }
}

export default function YandexMetrika() {
  const consent = useConsent();
  const pathname = usePathname();
  const loaded = useRef(false);
  const firstPath = useRef(true);

  useEffect(() => {
    if (!ENABLED || loaded.current) return;
    if (localStorage.getItem(CONSENT_KEY) !== "yes") return;
    loaded.current = true;
    const q: YM = (...a: unknown[]) => {
      (q.a = q.a || []).push(a);
    };
    q.l = Date.now();
    window.ym = q;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://mc.yandex.ru/metrika/tag.js";
    document.head.appendChild(s);
    window.ym(YM_ID, "init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
    });
  }, [consent]);

  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    if (loaded.current && window.ym) window.ym(YM_ID, "hit", window.location.href);
  }, [pathname]);

  return null;
}
