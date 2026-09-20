// components/AssistantAboutItem.tsx — пункт «Помощник» в карте сайта «О нас»; скрыт при выключенном флаге (ds_site#94).
"use client";

import { useAssistantEnabled } from "@/lib/assistant-flag";

export default function AssistantAboutItem() {
  if (useAssistantEnabled() !== true) return null;
  return (
    <li>
      <strong>Помощник</strong> — задайте подробный вопрос своими словами, ответ собирается из проверенных материалов со
      ссылками на источники
    </li>
  );
}
