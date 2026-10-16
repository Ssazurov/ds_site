export type FavEntry = { id: string; at: number };
export function parseFavs(raw: string | null): FavEntry[];
export function addFav(list: FavEntry[], id: string, at?: number): FavEntry[];
export function removeFav(list: FavEntry[], id: string): FavEntry[];
export function sortNewestFirst(list: FavEntry[]): FavEntry[];
export function filterByTitle<T>(items: T[], q: string, getTitle: (it: T) => string): T[];

export type FavItem = { id: string; at: number; title: string; meta: Record<string, unknown> };
export type FavFilters = {
  q: string; direction: string; category: string; age: string; target_audience: string; tag: string;
  dateFrom: string; dateTo: string; sortBy: "publish_date" | "title" | "created_at" | "rating"; sortDir: "asc" | "desc";
};
export const FAV_FILTER_KEYS: ("direction" | "category" | "age" | "target_audience")[];
export const EMPTY_FAV_FILTERS: FavFilters;
export function favFacets(items: FavItem[]): Record<string, string[]>;
export function applyFavFilters(items: FavItem[], f: FavFilters): FavItem[];
