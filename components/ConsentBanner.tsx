"use client";

import { setConsent, useConsent } from "@/lib/favorites";

export default function ConsentBanner() {
  const consent = useConsent();
  if (consent !== null) return null;
  return (
    <div className="consent-banner" role="dialog" aria-label="Сохранение данных в браузере">
      <p>
        Чтобы работало избранное, сайт сохраняет список статей в вашем браузере (localStorage).
        Данные не передаются на сервер, очистить их можно в настройках браузера.
      </p>
      <div className="consent-actions">
        <button type="button" onClick={() => setConsent("yes")}>Принять</button>
        <button type="button" onClick={() => setConsent("no")}>Не нужно</button>
      </div>
    </div>
  );
}
