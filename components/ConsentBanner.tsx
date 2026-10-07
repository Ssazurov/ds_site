"use client";

import { setConsent, useConsent } from "@/lib/favorites";

const STATIC = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

export default function ConsentBanner() {
  const consent = useConsent();
  if (consent !== null) return null;
  return (
    <div className="consent-banner" role="dialog" aria-label="Сохранение данных в браузере">
      <p>
        {STATIC
          ? "Чтобы работало избранное, сайт сохраняет список статей в вашем браузере (localStorage). Также с вашего согласия используется Яндекс.Метрика (cookies) для анонимной статистики посещений. Данные можно очистить в настройках браузера."
          : "Чтобы работало избранное, сайт сохраняет список статей в вашем браузере (localStorage). Данные не передаются на сервер, очистить их можно в настройках браузера."}
      </p>
      <div className="consent-actions">
        <button type="button" onClick={() => setConsent("yes")}>Принять</button>
        <button type="button" onClick={() => setConsent("no")}>Не нужно</button>
      </div>
    </div>
  );
}
