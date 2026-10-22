// ds_site#230: publish-pages.mjs --release-only на временных git-репозиториях (без сети и сборки).
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "publish-pages.mjs");
const G = ["-c", "user.name=t", "-c", "user.email=t@t"];
const git = (cwd, ...a) => {
  const r = spawnSync("git", [...G, ...a], { cwd, encoding: "utf-8" });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
};

function setup(withBranch) {
  const root = mkdtempSync(path.join(os.tmpdir(), "rel-test-"));
  const bare = path.join(root, "remote.git");
  const work = path.join(root, "work");
  git(root, "init", "-q", "--bare", "-b", "main", bare);
  if (withBranch) {
    const seed = path.join(root, "seed");
    mkdirSync(path.join(seed, "data"), { recursive: true });
    git(root, "init", "-q", "-b", "gh-pages", seed);
    writeFileSync(path.join(seed, "index.html"), "old-site");
    writeFileSync(path.join(seed, "data", "releases.json"), '{"releases":[]}');
    git(seed, "add", "-A");
    git(seed, "commit", "-qm", "seed");
    git(seed, "push", "-q", bare, "gh-pages:gh-pages");
  }
  mkdirSync(path.join(work, "content", "releases"), { recursive: true });
  git(root, "init", "-q", "-b", "main", work);
  git(work, "remote", "add", "origin", bare);
  return { bare, work };
}
const run = (work) => spawnSync(process.execPath, [SCRIPT, "--release-only"], { cwd: work, encoding: "utf-8" });

test("release-only: обновляет только data/releases.json обычным коммитом", () => {
  const { bare, work } = setup(true);
  const body = JSON.stringify({ releases: [{ version: "1.2.3", date: "2026-10-22", notes: "x" }] });
  writeFileSync(path.join(work, "content", "releases", "releases.json"), body);
  const r = run(work);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const chk = mkdtempSync(path.join(os.tmpdir(), "rel-chk-"));
  git(chk, "clone", "-q", "-b", "gh-pages", bare, "c");
  assert.equal(readFileSync(path.join(chk, "c", "data", "releases.json"), "utf-8"), body);
  assert.equal(readFileSync(path.join(chk, "c", "index.html"), "utf-8"), "old-site");
  assert.equal(git(path.join(chk, "c"), "rev-list", "--count", "HEAD"), "2"); // история не затёрта
});

test("release-only: без ветки gh-pages — отказ", () => {
  const { work } = setup(false);
  writeFileSync(path.join(work, "content", "releases", "releases.json"), '{"releases":[]}');
  const r = run(work);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /gh-pages/);
});
