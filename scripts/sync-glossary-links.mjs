#!/usr/bin/env node
// ADR-0004 п.3: сайт не ходит в gar-core-api на каждый запрос за
// глоссарием/ссылками. Этот скрипт — односторонний pull-синк:
// читает /public/glossary-terms и /public/resource-links (status=active,
// фильтрация на стороне gar-core-api) и материализует их в
// data/glossary-links-cache.json. Запускать по расписанию (cron) или по
// кнопке "опубликовать" в Streamlit-админке (issue ds_search, follow-up).
//
// При недоступности gar-core-api существующий кэш НЕ трогаем — сайт
// продолжает отдавать последнюю синхронизированную копию (ADR-0004).

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = join(__dirname, "..", "data", "glossary-links-cache.json");

const GAR_URL = process.env.GAR_URL ?? "http://localhost:8000";
const GAR_PUBLIC_API_KEY = process.env.GAR_PUBLIC_API_KEY;

function headers() {
  if (!GAR_PUBLIC_API_KEY) {
    throw new Error("GAR_PUBLIC_API_KEY не задан");
  }
  return { "X-Public-Api-Key": GAR_PUBLIC_API_KEY };
}

async function fetchJson(path) {
  const res = await fetch(`${GAR_URL}${path}`, { headers: headers() });
  if (!res.ok) {
    throw new Error(`${path} -> HTTP ${res.status}`);
  }
  return res.json();
}

async function main() {
  let terms, links;
  try {
    [terms, links] = await Promise.all([
      fetchJson("/public/glossary-terms"),
      fetchJson("/public/resource-links"),
    ]);
  } catch (err) {
    console.warn(
      `[sync-glossary-links] gar-core-api недоступен (${err.message}) — ` +
        "кэш не трогаю, отдаём последнюю синхронизированную копию.",
    );
    process.exitCode = 1;
    return;
  }

  const payload = {
    syncedAt: new Date().toISOString(),
    terms: terms.terms ?? [],
    links: links.links ?? [],
  };

  await mkdir(dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(payload, null, 2) + "\n", "utf-8");
  console.log(
    `[sync-glossary-links] OK: ${payload.terms.length} терминов, ` +
      `${payload.links.length} ссылок -> ${CACHE_PATH}`,
  );
}

main();
