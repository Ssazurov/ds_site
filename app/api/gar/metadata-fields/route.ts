// app/api/gar/metadata-fields/route.ts
// Отдаёт value -> label словарь по direction/category/doc_type/age/target_audience
// из GAR (источник правды, issue ds_site#12). Кэш в памяти процесса (TTL),
// т.к. эндпоинт GAR admin-only и не должен дёргаться на каждый рендер фильтра.

import { NextRequest, NextResponse } from "next/server";
import { garMetadataFields } from "@/lib/gar";
import type { FilterKey, MetadataLabels } from "@/lib/gar";

const TTL_MS = 5 * 60 * 1000;
let cache: { datasetId: string; data: MetadataLabels; ts: number } | null = null;

const KNOWN_KEYS: FilterKey[] = ["direction", "category", "doc_type", "age", "target_audience"];

export async function GET(req: NextRequest) {
  const datasetId = req.nextUrl.searchParams.get("dataset_id");
  if (!datasetId) {
    return NextResponse.json({ error: "dataset_id обязателен" }, { status: 400 });
  }
  if (cache && cache.datasetId === datasetId && Date.now() - cache.ts < TTL_MS) {
    return NextResponse.json(cache.data);
  }
  try {
    const res = await garMetadataFields(datasetId);
    if (!res.ok) {
      return NextResponse.json({ error: `GAR ${res.status}` }, { status: 502 });
    }
    const raw = (await res.json()) as {
      fields?: { key: string; options?: { value: string; label: string }[] }[];
    };
    const labels = {} as MetadataLabels;
    for (const key of KNOWN_KEYS) labels[key] = {};
    for (const field of raw.fields || []) {
      if (!KNOWN_KEYS.includes(field.key as FilterKey)) continue;
      for (const opt of field.options || []) {
        labels[field.key as FilterKey][opt.value] = opt.label;
      }
    }
    cache = { datasetId, data: labels, ts: Date.now() };
    return NextResponse.json(labels);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GAR request failed" },
      { status: 502 },
    );
  }
}
