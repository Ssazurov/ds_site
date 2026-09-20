// Чистая логика выгрузки контента для внешнего сайта (ds_site#92, ADR-0018).
// Без сети и файловой системы — покрыта scripts/export-lib.test.mjs.

// Публикуются только эти значения publish_permission; всё остальное
// (not_set, denied, неизвестное, отсутствующее) — НЕ выгружается (fail closed).
export const PUBLISHABLE = new Set(["not_required", "granted"]);
export const FULL_TEXT_PERMISSION = "granted";
export const SUMMARY_MAX = 400;

// Белый список метаданных, попадающих в публичный JSON. Внутренние поля GAR
// (пути, canonical_md_url, служебные id) сюда не входят.
export const META_WHITELIST = [
  "direction", "category", "doc_type", "age", "target_audience", "tags",
  "publish_date", "author", "attribution", "keywords", "lifecycle_stage",
  "reading_time_min", "source_domain",
];

export function permissionOf(meta) {
  const v = meta?.publish_permission;
  return typeof v === "string" && v ? v : "not_set";
}

export function isPublishable(meta) {
  return PUBLISHABLE.has(permissionOf(meta));
}

// Ссылка на оригинал: только внешние адреса. canonical_md_url — адрес GAR,
// в публичный JSON не попадает.
export function sourceUrlOf(meta) {
  for (const k of ["source_url", "original_url"]) {
    const v = meta?.[k];
    if (typeof v === "string" && /^https?:\/\//i.test(v)) return v;
  }
  return null;
}

export function summarize(text, max = SUMMARY_MAX) {
  const plain = String(text ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[#>\-*+\s]+/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[.,;:\s]+$/, "")}…`;
}

export function needsContent(doc) {
  const meta = doc.metadata ?? {};
  if (!isPublishable(meta)) return false;
  if (permissionOf(meta) === FULL_TEXT_PERMISSION) return true;
  const d = meta.description;
  return !(typeof d === "string" && d.trim());
}

// content — markdown из GAR (или null). Возвращает запись для публикации
// либо null, если документ публиковать нельзя.
export function buildRecord(doc, content) {
  const meta = doc.metadata ?? {};
  if (!isPublishable(meta)) return null;
  const permission = permissionOf(meta);
  const desc = typeof meta.description === "string" ? meta.description.trim() : "";
  const summary = desc ? summarize(desc) : summarize(content ?? "");
  const md = {};
  for (const k of META_WHITELIST) {
    if (meta[k] !== undefined && meta[k] !== null && meta[k] !== "") md[k] = meta[k];
  }
  const rec = {
    document_id: doc.document_id,
    title: typeof meta.title === "string" && meta.title ? meta.title : doc.doc_name,
    permission,
    summary,
    source_url: sourceUrlOf(meta),
    metadata: md,
  };
  if (permission === FULL_TEXT_PERMISSION && content) rec.full_text = content;
  return rec;
}

// Разбор списка: публикуемые записи + счётчики отброшенных (без названий).
export function buildCollection(docs, contents = {}) {
  const items = [];
  const skipped = {};
  for (const doc of docs) {
    const rec = buildRecord(doc, contents[doc.document_id] ?? null);
    if (rec) items.push(rec);
    else {
      const p = permissionOf(doc.metadata);
      skipped[p] = (skipped[p] ?? 0) + 1;
    }
  }
  return { items, skipped };
}

// Страховка: секреты не должны попасть в выходной файл.
export function assertNoSecrets(serialized, secrets) {
  for (const s of secrets) {
    if (s && String(s).length >= 4 && serialized.includes(String(s))) {
      throw new Error("export aborted: secret/GAR address found in output");
    }
  }
}
