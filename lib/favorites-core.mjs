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
