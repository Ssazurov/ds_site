// lib/static-ids.ts — серверный хелпер для generateStaticParams (ds_site#93, ADR-0018).
// Внешняя сборка: id берутся из выгрузки data/export/<name>.json.
// Внутренняя сборка (GAR-прокси): страницы рендерятся по запросу — список пуст.
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function staticIds(name: "articles" | "news"): Promise<{ id: string }[]> {
  if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== "1") return [];
  const file = path.join(process.cwd(), "data", "export", `${name}.json`);
  let raw: string;
  try {
    raw = await readFile(file, "utf-8");
  } catch {
    throw new Error(`нет выгрузки ${file}: сначала npm run export:content`);
  }
  const items = (JSON.parse(raw).items ?? []) as { document_id: string }[];
  // Пустая выгрузка (нет разрешённых материалов): Next требует непустой список для output: export —
  // отдаём заглушку, страница покажет «Материал не найден».
  if (!items.length) return [{ id: "_empty" }];
  return items.map((i) => ({ id: i.document_id }));
}
