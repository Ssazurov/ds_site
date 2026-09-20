// lib/gar/labels.ts
// Клиентский хук: value -> русская подпись по всем фильтрам, из
// /api/gar/metadata-fields (issue ds_site#12). Один fetch на сессию вкладки
// (module-level singleton promise), т.к. словарь общий для всех страниц.

"use client";

import { useEffect, useState } from "react";
import type { FilterKey, MetadataLabels } from "./types";
import { getLabels } from "./data";

const EMPTY: MetadataLabels = {
  direction: {},
  category: {},
  doc_type: {},
  age: {},
  target_audience: {},
};

let inflight: Promise<MetadataLabels> | null = null;

function fetchLabels(datasetId: string): Promise<MetadataLabels> {
  if (!inflight) {
    inflight = getLabels(datasetId).then((d) => d ?? EMPTY).catch(() => EMPTY);
  }
  return inflight;
}

export function useMetadataLabels(datasetId: string) {
  const [labels, setLabels] = useState<MetadataLabels>(EMPTY);

  useEffect(() => {
    if (!datasetId) return;
    let cancelled = false;
    fetchLabels(datasetId).then((data) => {
      if (!cancelled) setLabels(data);
    });
    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  function ruLabel(key: FilterKey, value: unknown): string | null {
    if (typeof value !== "string" || !value) return null;
    return labels[key]?.[value] || value;
  }

  return { labels, ruLabel };
}
