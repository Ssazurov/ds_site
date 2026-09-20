// Публикация внешнего сайта на GitHub Pages (ds_site#95, ADR-0018), без GitHub Action:
//   выгрузка из GAR -> раскладка данных -> next build (внешний режим) -> проверка на
//   секреты -> force-push orphan-ветки gh-pages (история не копится; отзыв = перезапись).
// Запуск ЛОКАЛЬНО: node scripts/publish-pages.mjs [--skip-export] [--dry-run]
//   --skip-export  не ходить в GAR, взять готовый data/export
//   --dry-run      собрать и проверить, но не пушить
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { assertNoSecrets } from "./export-lib.mjs";

const args = new Set(process.argv.slice(2));
const OUT = ".next-static"; // при NEXT_DIST_DIR экспорт Next кладёт HTML прямо в distDir
const BASE_PATH = "/ds_site";
const BRANCH = "gh-pages";

function run(cmd, argv, opts = {}) {
  const r = spawnSync(cmd, argv, { stdio: "inherit", ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${argv.join(" ")} завершился с кодом ${r.status}`);
}
function out(cmd, argv, opts = {}) {
  const r = spawnSync(cmd, argv, { encoding: "utf-8", ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${argv.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}

function envLocal() {
  try {
    return Object.fromEntries(readFileSync(".env.local", "utf-8").split(/\r?\n/)
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean)
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]));
  } catch { return {}; }
}

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

// Страховка: ключ/адрес GAR и id набора не должны попасть в публикуемые файлы.
function scanForSecrets(dir) {
  const env = envLocal();
  const secrets = [env.GAR_PUBLIC_API_KEY, env.GAR_URL, env.NEXT_PUBLIC_GAR_DATASET_ID];
  let n = 0;
  for (const f of walk(dir)) {
    if (!/\.(html|js|json|txt|css|map)$/.test(f)) continue;
    assertNoSecrets(readFileSync(f, "utf-8"), secrets);
    n++;
  }
  console.log(`проверка секретов: ${n} файлов чисто`);
}

function ensurePages(repo) {
  const r = spawnSync("gh", ["api", `repos/${repo}/pages`], { encoding: "utf-8" });
  if (r.status === 0) return console.log("Pages уже включены");
  run("gh", ["api", "-X", "POST", `repos/${repo}/pages`, "-f", `source[branch]=${BRANCH}`, "-f", "source[path]=/"]);
  console.log("Pages включены (source: gh-pages)");
}

function main() {
  if (!args.has("--skip-export")) run(process.execPath, ["scripts/export-content.mjs"]);
  run(process.execPath, ["scripts/prepare-static.mjs"]);

  rmSync(OUT, { recursive: true, force: true });
  const env = {
    ...process.env,
    NEXT_PUBLIC_STATIC_EXPORT: "1",
    NEXT_DIST_DIR: OUT, // не трогаем .next внутренней сборки
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
    NEXT_PUBLIC_ASSISTANT_ENABLED: process.env.NEXT_PUBLIC_ASSISTANT_ENABLED ?? "0",
    NEXT_PUBLIC_GAR_DATASET_ID: "static", // реальный id набора в статику не попадает
  };
  run(process.execPath, ["node_modules/next/dist/bin/next", "build"], { env });
  scanForSecrets(OUT);
  writeFileSync(path.join(OUT, ".nojekyll"), ""); // иначе Pages (Jekyll) игнорирует _next/

  if (args.has("--dry-run")) return console.log(`dry-run: сборка в ${OUT}/, публикация пропущена`);

  const remote = out("git", ["remote", "get-url", "origin"]);
  const repo = remote.replace(/^.*github\.com[:/]/, "").replace(/\.git$/, "");
  const name = out("git", ["config", "user.name"]) || "ds-site-publisher";
  const email = out("git", ["config", "user.email"]) || "noreply@users.noreply.github.com";
  const tmp = mkdtempSync(path.join(os.tmpdir(), "ds-pages-"));
  try {
    cpSync(OUT, tmp, { recursive: true });
    const git = (...a) => run("git", ["-C", tmp, ...a]);
    git("init", "-q", "-b", BRANCH);
    git("add", "-A");
    git("-c", `user.name=${name}`, "-c", `user.email=${email}`, "commit", "-q", "-m", `publish ${new Date().toISOString()}`);
    git("push", "--force", remote, `${BRANCH}:${BRANCH}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  ensurePages(repo);
  console.log(`опубликовано: https://${repo.split("/")[0].toLowerCase()}.github.io/${repo.split("/")[1]}/`);
}

try { main(); } catch (e) { console.error(String(e.message ?? e)); process.exit(1); }
