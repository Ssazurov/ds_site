// Выгрузка контента из GAR в JSON для внешнего статического сайта
// (ds_site#92, ADR-0018). Запускается ЛОКАЛЬНО (GAR и ключ доступны только
// здесь): node scripts/export-content.mjs [--out data/export]
// Фильтр по publish_permission — здесь, а не в браузере: опубликованный JSON
// виден всем. Ключ и адрес GAR в выходные файлы не попадают.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  assertNoSecrets, buildCollection, needsContent,
} from "./export-lib.mjs";

const COLLECTIONS = {
  articles: ["article"],
  news: ["news"],
  glossary: ["glossary_term", "glossary_abb"],
  links: ["link"],
};

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

  await mkdir(outDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const manifest = { generated_at: generatedAt, collections: {} };
  for (const [name, types] of Object.entries(COLLECTIONS)) {
    const docs = (await Promise.all(types.map(listAll))).flat();
    const contents = {};
    await pool(docs.filter(needsContent), 4, async (d) => {
      contents[d.document_id] = await content(d.document_id);
    });
    const { items, skipped } = buildCollection(docs, contents);
    const body = JSON.stringify({ generated_at: generatedAt, count: items.length, items }, null, 2);
    assertNoSecrets(body, [key, gar]);
    await writeFile(path.join(outDir, `${name}.json`), body, "utf-8");
    manifest.collections[name] = { count: items.length, skipped };
    console.log(`${name}: ${items.length} выгружено, отброшено ${JSON.stringify(skipped)}`);
  }
  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`готово: ${outDir}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
}
