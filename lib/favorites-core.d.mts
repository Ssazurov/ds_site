export type FavEntry = { id: string; at: number };
export function parseFavs(raw: string | null): FavEntry[];
export function addFav(list: FavEntry[], id: string, at?: number): FavEntry[];
export function removeFav(list: FavEntry[], id: string): FavEntry[];
export function sortNewestFirst(list: FavEntry[]): FavEntry[];
export function filterByTitle<T>(items: T[], q: string, getTitle: (it: T) => string): T[];
