// lib/gar/domain.ts — домен источника статьи для фильтра "Домен" (ADR-0020).
// Группировка по registrable domain: blog.example.org и www.example.org -> example.org.
// Без public-suffix-list: двухуровневые зоны вида co.uk/com.ru покрыты эвристикой.
const SLD = new Set(["co", "com", "org", "net", "gov", "edu", "ac"]);

export function registrableDomain(url: unknown): string | null {
  if (typeof url !== "string" || !url) return null;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  const p = host.split(".");
  if (p.length <= 2) return host;
  const n = p[p.length - 1].length === 2 && SLD.has(p[p.length - 2]) ? 3 : 2;
  return p.slice(-n).join(".");
}
