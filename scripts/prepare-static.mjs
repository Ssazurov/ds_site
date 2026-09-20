// Раскладка выгрузки для статической сборки (ds_site#93, ADR-0018):
// data/export/*.json -> public/data/ (Next копирует public/ в статический вывод).
// Списки без полного текста; полный текст — отдельными файлами <coll>/<id>.json,
// чтобы список не тянул все статьи. public/data в .gitignore.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { splitCollection } from "./export-lib.mjs";

const NAMES = ["articles", "news", "glossary", "links"];

export async function prepare(src = "data/export", dst = "public/data") {
  await rm(dst, { recursive: true, force: true });
  await mkdir(dst, { recursive: true });
  for (const name of NAMES) {
    const data = JSON.parse(await readFile(path.join(src, `${name}.json`), "utf-8"));
    const { list, details } = splitCollection(data.items ?? []);
    await writeFile(path.join(dst, `${name}.json`),
      JSON.stringify({ generated_at: data.generated_at, count: list.length, items: list }));
    const ids = Object.keys(details);
    if (ids.length) await mkdir(path.join(dst, name), { recursive: true });
    for (const id of ids) {
      await writeFile(path.join(dst, name, `${id}.json`), JSON.stringify(details[id]));
    }
    console.log(`${name}: ${list.length} в списке, ${ids.length} с полным текстом`);
  }
  await writeFile(path.join(dst, "labels.json"), await readFile(path.join(src, "labels.json")));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  prepare().catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
}
