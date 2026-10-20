// lib/releases.ts
// Релизы APK (ds_site#225): данные в content/releases/releases.json, пишет ds_search («Управление релизом»).
import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "content", "releases", "releases.json");

export type Release = {
  version: string; // X.Y.Z
  date: string; // YYYY-MM-DD
  notes: string; // markdown
  apk_url?: string;
  size_mb?: number;
  sha256?: string;
  build?: number;
};

export function listReleases(): Release[] {
  try {
    const r = JSON.parse(fs.readFileSync(FILE, "utf8")).releases as Release[];
    return [...r].sort((a, b) => b.date.localeCompare(a.date) || b.version.localeCompare(a.version, undefined, { numeric: true }));
  } catch {
    return [];
  }
}

export function getRelease(version: string): Release | null {
  return listReleases().find((r) => r.version === version) ?? null;
}
