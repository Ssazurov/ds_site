// lib/reestr-docs.ts
// Документация для реестра Минцифры (источник: ds_app/docs/reestr, копия в content/reestr).
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "content", "reestr");

export type ReestrDoc = { slug: string; title: string };

export function listDocs(): ReestrDoc[] {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => {
      const slug = f.replace(/\.md$/, "");
      return { slug, title: getDoc(slug)?.title ?? slug };
    });
}

export function getDoc(slug: string): { title: string; body: string } | null {
  if (!/^[\w-]+$/.test(slug)) return null;
  const file = path.join(DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const body = fs.readFileSync(file, "utf8");
  const title = body.match(/^#\s+(.+)$/m)?.[1] ?? slug;
  return { title, body };
}
