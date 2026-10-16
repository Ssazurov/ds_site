// Выгрузка контента из GAR в JSON для внешнего статического сайта
// (ds_site#92, ADR-0018). Запускается ЛОКАЛЬНО (GAR и ключ доступны только
// здесь): node scripts/export-content.mjs [--out data/export]
// Фильтр по publish_permission — здесь, а не в браузере: опубликованный JSON
// виден всем. Ключ и адрес GAR в выходные файлы не попадают.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  assertNoSecrets, buildCollection, buildLabels, needsContent, setSourcePermissions,
} from "./export-lib.mjs";

const COLLECTIONS = {
  articles: ["article"],
  news: ["news"],
  glossary: ["glossary_term", "glossary_abb"],
  links: ["link"],
};

// Рейтинг = сумма 👍(+1)/👎(-1) из gar_core.site_votes (её наполняет worker/votes/sync_votes.py).
// Недоступна БД — рейтинг не выгружаем (статика откатится на запрос к Worker).
function loadRatings() {
  try {
    const out = execFileSync("docker", ["exec", "-i", process.env.GAR_DB_CONTAINER ?? "docker-db_postgres-1",
      "psql", "-U", "postgres", "-d", "gar_core", "-tA", "-F", "|", "-c",
      "SELECT doc_id, COALESCE(SUM(vote),0) FROM site_votes GROUP BY doc_id"], { encoding: "utf-8", timeout: 20000 });
    const m = new Map();
    for (const line of out.split("\n")) { const [id, v] = line.split("|"); if (id && v !== undefined) m.set(id.trim(), Number(v)); }
    return m;
  } catch (e) {
    console.warn(`рейтинг не выгружен (site_votes недоступна): ${String(e.message ?? e).split("\n")[0]}`);
    return null;
  }
}

async function main() {
  try { process.loadEnvFile(".env.local"); } catch { /* env уже задан */ }
  const gar = (process.env.GAR_URL ?? "http://localhost:8000").replace(/\/+$/, "");
  const key = process.env.GAR_PUBLIC_API_KEY;
  const datasetId = process.env.NEXT_PUBLIC_GAR_DATASET_ID;
  if (!key || !datasetId) {
    throw new Error("нужны GAR_PUBLIC_API_KEY и NEXT_PUBLIC_GAR_DATASET_ID (см. .env.local.example)");
  }
  const outIdx = process.argv.indexOf("--out");
  const outDir = path.resolve(outIdx > 0 ? process.argv[outIdx + 1] : "data/export");
  const headers = { "X-Public-Api-Key": key };

  async function listAll(docType) {
    const out = [];
    for (let page = 1; page <= 100; page++) {
      const q = new URLSearchParams({ dataset_id: datasetId, doc_type: docType, per_page: "100", page: String(page) });
      const res = await fetch(`${gar}/public/documents?${q}`, { headers });
      if (!res.ok) throw new Error(`GAR ${docType} p${page}: HTTP ${res.status}`);
      const data = await res.json();
      const docs = data.documents ?? [];
      out.push(...docs);
      if (!docs.length || out.length >= (data.total ?? 0)) break;
    }
    return out;
  }

  async function content(id) {
    const res = await fetch(`${gar}/public/documents/${id}/content`, { headers });
    return res.ok ? await res.text() : null;
  }

  async function pool(items, n, fn) {
    let i = 0;
    await Promise.all(Array.from({ length: n }, async () => {
      while (i < items.length) await fn(items[i++]);
    }));
  }

  // Разрешение источника (домена) из локального кэша реестра ds_search (#263).
  const regPath = path.resolve(process.env.SOURCE_REGISTRY_CACHE ?? "../ds_search/data/source_registry_cache.json");
  const registry = JSON.parse(await readFile(regPath, "utf-8")).entries ?? {};
  setSourcePermissions(registry);
  console.log(`реестр источников: ${Object.keys(registry).length} доменов`);

  const ratings = loadRatings();
  await mkdir(outDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const manifest = { generated_at: generatedAt, collections: {} };
  const droppedAll = [];
  const statsAll = [];
  for (const [name, types] of Object.entries(COLLECTIONS)) {
    const docs = (await Promise.all(types.map(listAll))).flat();
    const contents = {};
    await pool(docs.filter(needsContent), 4, async (d) => {
      contents[d.document_id] = await content(d.document_id);
    });
    const { items, skipped, dropped, stats } = buildCollection(docs, contents);
    if (ratings) for (const it of items) it.metadata.rating = ratings.get(it.document_id) ?? 0;
    const body = JSON.stringify({ generated_at: generatedAt, count: items.length, items }, null, 2);
    assertNoSecrets(body, [key, gar]);
    await writeFile(path.join(outDir, `${name}.json`), body, "utf-8");
    for (const d of dropped) droppedAll.push({ type: name, ...d });
    for (const x of stats) statsAll.push({ type: name, ...x });
    manifest.collections[name] = { count: items.length, skipped };
    console.log(`${name}: ${items.length} выгружено, отброшено ${JSON.stringify(skipped)}`);
  }
  const lres = await fetch(`${gar}/public/metadata-fields?${new URLSearchParams({ dataset_id: datasetId })}`, { headers });
  if (!lres.ok) throw new Error(`GAR metadata-fields: HTTP ${lres.status}`);
  await writeFile(path.join(outDir, "labels.json"), JSON.stringify(buildLabels(await lres.json()), null, 2), "utf-8");
  // Только для отчёта в ds_search; prepare-static.mjs копирует файлы по белому списку, сюда не входит.
  await writeFile(path.join(outDir, "dropped.json"), JSON.stringify({ generated_at: generatedAt, items: droppedAll }, null, 2), "utf-8");
  await writeFile(path.join(outDir, "source_stats.json"), JSON.stringify({ generated_at: generatedAt, items: statsAll }, null, 2), "utf-8");
  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`готово: ${outDir}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
}
