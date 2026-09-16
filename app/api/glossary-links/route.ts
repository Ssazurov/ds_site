// Отдаёт локальный pull-синк кэш глоссария/ссылок (ADR-0004 п.3) — НЕ
// проксирует запрос в gar-core-api. Источник данных для будущего перевода
// /glossary и /links с live-запросов на этот роут (заблокировано issue
// gar-core-api: миграция entities -> glossary_terms/resource_links пуста).
import { NextResponse } from "next/server";
import { readGlossaryLinksCache } from "@/lib/gar/glossary-links-cache";

export async function GET() {
  const cache = await readGlossaryLinksCache();
  return NextResponse.json(cache);
}
