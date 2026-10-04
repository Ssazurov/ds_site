// lib/gar/tags.ts — теги документа (ADR-0028 п.6, ds_site#138).
// metadata.tags может приходить строкой или массивом строк.

export const TAG_PARAM = "tag";

export function docTags(metadata: Record<string, unknown> | undefined): string[] {
  const raw = metadata?.tags;
  const list = ([] as unknown[]).concat(raw ?? []);
  return [...new Set(list.filter((t): t is string => typeof t === "string" && t.trim() !== "").map((t) => t.trim()))];
}
