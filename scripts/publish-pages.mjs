// Публикация внешнего сайта на GitHub Pages (ds_site#95, ADR-0018), без GitHub Action:
//   выгрузка из GAR -> раскладка данных -> next build (внешний режим) -> проверка на
//   секреты -> force-push orphan-ветки gh-pages (история не копится; отзыв = перезапись).
// Запуск ЛОКАЛЬНО: node scripts/publish-pages.mjs [--skip-export] [--dry-run]
//   --skip-export  не ходить в GAR, взять готовый data/export
//   --dry-run      собрать и проверить, но не пушить
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { assertNoSecrets } from "./export-lib.mjs";

const args = new Set(process.argv.slice(2));
const OUT = ".next-static"; // при NEXT_DIST_DIR экспорт Next кладёт HTML прямо в distDir
// :3002 (_ds_app_site, статика) -> origin этого репо (https://ssazurov.github.io/ds_site/);
// :3001 (Next, внешний режим) -> отдельный репо Pages (https://ssazurov.github.io/ds_site_next/).
const NEXT_REPO = process.env.NEXT_PAGES_REPO || "Ssazurov/ds_site_next";
const BASE_PATH = "/" + NEXT_REPO.split("/")[1];
const NEXT_REMOTE = process.env.NEXT_PAGES_REMOTE || `https://github.com/${NEXT_REPO}.git`;
const APP_SITE_DIR = path.resolve(process.env.DS_APP_SITE_DIR || path.join("..", "..", "_ds_app_site"));
const APP_SITE_SKIP = new Set([".git", ".gitignore", "download", "_build", "_fix.sh"]); // APK и служебное — не в Pages
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

// Только релиз (ds_site#230): заменить data/releases.json в существующей gh-pages обычным коммитом.
function nextReleaseBody() {
  const src = "content/releases/releases.json";
  const rel = JSON.parse(readFileSync(src, "utf-8"));
  // для GitHub Pages локальную ссылку на APK заменяет gh_apk_url (если APK ещё не загружен на GitHub — ссылки нет)
  for (const r of rel.releases) if (r.gh_apk_url) { r.apk_url = r.gh_apk_url; delete r.gh_apk_url; } else if (r.apk_url?.startsWith("/")) delete r.apk_url;
  const body = JSON.stringify(rel, null, 2) + "\n";
  assertNoSecrets(body, [envLocal().GAR_PUBLIC_API_KEY, envLocal().GAR_URL, envLocal().NEXT_PUBLIC_GAR_DATASET_ID]);
  return body;
}

function pushRelease(remote, dstRel, body) {
  const soft = (key) => spawnSync("git", ["config", key], { encoding: "utf-8" }).stdout?.trim() ?? "";
  const name = soft("user.name") || "ds-site-publisher";
  const email = soft("user.email") || "noreply@users.noreply.github.com";
  const tmp = mkdtempSync(path.join(os.tmpdir(), "ds-pages-rel-"));
  try {
    const c = spawnSync("git", ["clone", "-q", "--depth", "1", "-b", BRANCH, remote, tmp], { stdio: "inherit" });
    if (c.status !== 0) throw new Error("ветка gh-pages не найдена: сначала полная публикация (npm run publish:pages)");
    const git = (...a) => run("git", ["-C", tmp, ...a]);
    const dst = path.join(tmp, dstRel);
    if (existsSync(dst) && readFileSync(dst, "utf-8") === body) return console.log("releases.json без изменений, публикация пропущена");
    writeFileSync(dst, body);
    git("add", dstRel);
    git("-c", `user.name=${name}`, "-c", `user.email=${email}`, "commit", "-q", "-m", `release ${new Date().toISOString()}`);
    for (let i = 0; ; i++) {
      const p = spawnSync("git", ["-C", tmp, "push", "origin", BRANCH], { stdio: "inherit" });
      if (p.status === 0) break;
      if (i >= 2) throw new Error("push gh-pages не удался");
      git("pull", "--rebase", "origin", BRANCH);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`релиз опубликован: ${remote} (${dstRel})`);
}

function releaseOnly() {
  pushRelease(NEXT_REMOTE, "data/releases.json", nextReleaseBody());
  const appRel = path.join(APP_SITE_DIR, "releases.json"); // :3002 — releases.json лежит в корне сайта
  if (existsSync(appRel)) pushRelease(out("git", ["remote", "get-url", "origin"]), "releases.json", readFileSync(appRel, "utf-8"));
  console.log("релиз опубликован (только releases.json)");
}

const pagesUrl = (repo) => `https://${repo.split("/")[0].toLowerCase()}.github.io/${repo.split("/")[1]}/`;

function ensureRepo(repo) {
  if (spawnSync("gh", ["repo", "view", repo], { encoding: "utf-8" }).status === 0) return;
  run("gh", ["repo", "create", repo, "--public", "--description", "ds-site: статический экспорт Next.js (:3001)"]);
  console.log(`репозиторий ${repo} создан`);
}

// что не попадает из _ds_app_site в Pages: APK, служебные файлы, Zone.Identifier, «копии»
function appSiteFilter(src) {
  const abs = path.resolve(src);
  if (abs === APP_SITE_DIR) return true;
  const top = path.relative(APP_SITE_DIR, abs).split(path.sep)[0];
  const base = path.basename(abs);
  return !APP_SITE_SKIP.has(top) && !base.endsWith(":Zone.Identifier") && !base.includes("копия");
}

// orphan-ветка gh-pages из каталога dir, force-push (история не копится)
function forcePush(dir, remote, filter) {
  // git config возвращает код 1, если ключ не задан (например в контейнере) — это не ошибка
  const soft = (key) => spawnSync("git", ["config", key], { encoding: "utf-8" }).stdout?.trim() ?? "";
  const name = soft("user.name") || "ds-site-publisher";
  const email = soft("user.email") || "noreply@users.noreply.github.com";
  const tmp = mkdtempSync(path.join(os.tmpdir(), "ds-pages-"));
  try {
    cpSync(dir, tmp, { recursive: true, ...(filter ? { filter } : {}) });
    writeFileSync(path.join(tmp, ".nojekyll"), "");
    const git = (...a) => run("git", ["-C", tmp, ...a]);
    git("init", "-q", "-b", BRANCH);
    git("add", "-A");
    git("-c", `user.name=${name}`, "-c", `user.email=${email}`, "commit", "-q", "-m", `publish ${new Date().toISOString()}`);
    git("push", "--force", remote, `${BRANCH}:${BRANCH}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function main() {
  if (args.has("--release-only")) return releaseOnly();
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
  // web-приложение (public/app) собрано под локальный /app/; на Pages оно живёт в /ds_site/app/
  const appIdx = path.join(OUT, "app", "index.html");
  if (existsSync(appIdx)) {
    writeFileSync(appIdx, readFileSync(appIdx, "utf-8").replace('<base href="/app/">', `<base href="${BASE_PATH}/app/">`));
  }
  writeFileSync(path.join(OUT, ".nojekyll"), ""); // иначе Pages (Jekyll) игнорирует _next/

  if (args.has("--dry-run")) return console.log(`dry-run: сборка в ${OUT}/, публикация пропущена`);

  // 1) :3001 (Next) -> отдельный репо Pages
  ensureRepo(NEXT_REPO);
  forcePush(OUT, NEXT_REMOTE);
  ensurePages(NEXT_REPO);
  console.log(`опубликовано (Next, :3001): ${pagesUrl(NEXT_REPO)}`);

  // 2) :3002 (_ds_app_site) -> origin (ds_site)
  if (!existsSync(path.join(APP_SITE_DIR, "index.html"))) throw new Error(`Не найден _ds_app_site (${APP_SITE_DIR}); задайте DS_APP_SITE_DIR`);
  const remote = out("git", ["remote", "get-url", "origin"]);
  const repo = remote.replace(/^.*github\.com[:/]/, "").replace(/\.git$/, "");
  forcePush(APP_SITE_DIR, remote, appSiteFilter);
  ensurePages(repo);
  console.log(`опубликовано: ${pagesUrl(repo)}`);
}

try { main(); } catch (e) { console.error(String(e.message ?? e)); process.exit(1); }
