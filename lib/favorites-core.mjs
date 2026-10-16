// lib/favorites-core.mjs — чистая логика избранного (ds_site#103), без DOM: тестируется node --test.
export function parseFavs(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const seen = new Set();
    const out = [];
    for (const e of arr) {
      if (e && typeof e.id === "string" && e.id && !seen.has(e.id)) {
        seen.add(e.id);
        out.push({ id: e.id, at: Number(e.at) || 0 });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function addFav(list, id, at = Date.now()) {
  return list.some((e) => e.id === id) ? list : [...list, { id, at }];
}

export function removeFav(list, id) {
  return list.filter((e) => e.id !== id);
}

export function sortNewestFirst(list) {
  return [...list].sort((a, b) => b.at - a.at);
}

export function filterByTitle(items, q, getTitle) {
  const needle = String(q || "").trim().toLowerCase();
  if (!needle) return items;
  return items.filter((it) => getTitle(it).toLowerCase().includes(needle));
}

const asList = (v) => [].concat(v ?? []).filter((x) => typeof x === "string" && x.trim() !== "").map((x) => x.trim());
export const FAV_FILTER_KEYS = ["direction", "category", "age", "target_audience"];
export const EMPTY_FAV_FILTERS = {
  q: "", direction: "", category: "", age: "", target_audience: "", tag: "",
  dateFrom: "", dateTo: "", sortBy: "created_at", sortDir: "desc",
};

/** Значения facets из метаданных загруженных статей: {direction: [...], ..., tag: [...]}. */
export function favFacets(items) {
  const out = { tag: [] };
  for (const k of FAV_FILTER_KEYS) out[k] = [];
  for (const it of items) {
    for (const k of FAV_FILTER_KEYS) out[k].push(...asList(it.meta?.[k]));
    out.tag.push(...asList(it.meta?.tags));
  }
  for (const k of Object.keys(out)) out[k] = [...new Set(out[k])].sort((a, b) => a.localeCompare(b, "ru"));
  return out;
}

/** items: {id, at, title, meta}. Фильтры + сортировка избранного на клиенте. */
export function applyFavFilters(items, f) {
  const needle = String(f.q || "").trim().toLowerCase();
  const day = (it) => String(it.meta?.publish_date ?? "").slice(0, 10);
  const list = items.filter((it) => {
    if (needle) {
      const hay = `${it.title} ${it.meta?.description ?? ""}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    for (const k of FAV_FILTER_KEYS) if (f[k] && !asList(it.meta?.[k]).includes(f[k])) return false;
    if (f.tag && !asList(it.meta?.tags).includes(f.tag)) return false;
    if (f.dateFrom || f.dateTo) {
      const d = day(it);
      if (!d || (f.dateFrom && d < f.dateFrom) || (f.dateTo && d > f.dateTo)) return false;
    }
    return true;
  });
  const sign = f.sortDir === "asc" ? 1 : -1;
  const cmp = {
    title: (a, b) => a.title.localeCompare(b.title, "ru"),
    publish_date: (a, b) => day(a).localeCompare(day(b)),
    created_at: (a, b) => a.at - b.at,
  }[f.sortBy] ?? ((a, b) => a.at - b.at);
  return list.sort((a, b) => sign * cmp(a, b));
}
