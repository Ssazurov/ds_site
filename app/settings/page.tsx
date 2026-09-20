// app/settings/page.tsx — настройки сайта (ds_site#94, ADR-0018): флаг «Помощник» и URL внешнего GAR.
// Значения хранятся в localStorage браузера; при заданном NEXT_PUBLIC_ASSISTANT_ENABLED флаг фиксирован сборкой.
"use client";

import { useState } from "react";
import {
  isAssistantFlagLocked,
  setAssistantEnabled,
  setExternalGarUrl,
  useAssistantEnabled,
  useExternalGarUrl,
} from "@/lib/assistant-flag";

export default function SettingsPage() {
  const enabled = useAssistantEnabled();
  const savedUrl = useExternalGarUrl();
  const [draft, setDraft] = useState<string | null>(null);
  const url = draft ?? savedUrl;

  return (
    <main className="chat-shell">
      <header className="chat-header about-header">
        <h1>Настройки</h1>
      </header>

      <section className="chat-panel about-text" aria-label="Настройки">
        <h2>Помощник</h2>
        <label className="select-check">
          <input
            type="checkbox"
            checked={enabled === true}
            disabled={isAssistantFlagLocked || enabled === null}
            onChange={(e) => setAssistantEnabled(e.target.checked)}
          />
          Показывать «Помощника» и выбор статей для него
        </label>
        {isAssistantFlagLocked && <p>Значение задано при сборке сайта и здесь не меняется.</p>}

        <h2>Внешний сервер GAR</h2>
        <p>
          <input
            type="url"
            value={url}
            placeholder="https://…"
            aria-label="URL внешнего сервера GAR"
            onChange={(e) => setDraft(e.target.value)}
            style={{ width: "100%", maxWidth: 480 }}
          />
        </p>
        <div className="selection-bar-actions">
          <button type="button" onClick={() => {
              setExternalGarUrl(url);
              setDraft(null);
            }}>
            Сохранить
          </button>
        </div>
      </section>
    </main>
  );
}
