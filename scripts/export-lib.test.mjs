// node --test scripts/  (ds_site#92)
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertNoSecrets, buildCollection, buildLabels, buildRecord, isPublishable, needsContent, permissionOf, setSourcePermissions, splitCollection, summarize,
} from "./export-lib.mjs";

// Разрешение берётся от источника (домена) из реестра, а не от статьи.
// Домен (lowercase, как в permissionOf) — по индексу, чтобы "Granted" и "granted" не совпали.
const PERMS = ["granted", "not_required", "denied", "not_set", "Granted", "yes", "", null];
const SRC = (perm) => `src${PERMS.indexOf(perm)}.test`;
const registry = (perms) => Object.fromEntries(perms.map((p) => [SRC(p), { publish_permission: p }]));
setSourcePermissions(registry(PERMS));

const doc = (id, perm, extra = {}) => ({
  document_id: id, doc_name: `Doc ${id}`,
  metadata: { ...(perm === undefined ? {} : { source_domain: SRC(perm) }), ...extra },
});

test("filter: only not_required and granted (source) are publishable", () => {
  assert.equal(isPublishable({ source_domain: SRC("not_required") }), true);
  assert.equal(isPublishable({ source_domain: SRC("granted") }), true);
  for (const p of ["not_set", "denied", "Granted", "yes", "", null]) {
    assert.equal(isPublishable({ source_domain: SRC(p) }), false, String(p));
  }
  assert.equal(isPublishable({}), false);
  assert.equal(permissionOf({}), "not_set");
});

test("личное publish_permission статьи игнорируется", () => {
  assert.equal(isPublishable({ source_domain: SRC("denied"), publish_permission: "granted" }), false);
  assert.equal(isPublishable({ source_domain: SRC("granted"), publish_permission: "denied" }), true);
});

test("buildCollection drops not_set/denied/missing and counts them", () => {
  const docs = [doc("a", "granted"), doc("b", "not_required"), doc("c", "denied"), doc("d", "not_set"), doc("e")];
  const { items, skipped } = buildCollection(docs, {});
  assert.deepEqual(items.map((i) => i.document_id), ["a", "b"]);
  assert.deepEqual(skipped, { denied: 1, not_set: 2 });
});

test("full text only for granted", () => {
  const g = buildRecord(doc("g", "granted", { description: "кратко" }), "# Полный текст");
  const n = buildRecord(doc("n", "not_required", { description: "кратко" }), "# Полный текст");
  assert.equal(g.full_text, "# Полный текст");
  assert.equal("full_text" in n, false);
  assert.equal(n.summary, "кратко");
});

test("needsContent: granted or no description", () => {
  assert.equal(needsContent(doc("g", "granted", { description: "x" })), true);
  assert.equal(needsContent(doc("n", "not_required", { description: "x" })), false);
  assert.equal(needsContent(doc("n", "not_required")), true);
  assert.equal(needsContent(doc("d", "denied")), false);
});

test("summary fallback from content is short, plain text", () => {
  const r = buildRecord(doc("n", "not_required"), "# Заголовок\n\n" + "слово ".repeat(200));
  assert.ok(r.summary.length <= 402 && r.summary.endsWith("…"));
  assert.ok(!r.summary.includes("#"));
  assert.equal(summarize("[текст](http://x.y)"), "текст");
});

test("source link: external only, internal GAR url and extra metadata excluded", () => {
  const r = buildRecord(doc("a", "granted", {
    canonical_md_url: "http://localhost:8000/x.md", source_url: "https://example.org/a",
    internal_path: "/srv/secret", direction: "law",
  }), "t");
  assert.equal(r.source_url, "https://example.org/a");
  assert.deepEqual(r.metadata, { direction: "law", source_domain: SRC("granted") });
  assert.equal(buildRecord(doc("b", "granted", { canonical_md_url: "http://localhost:8000/x.md" }), "t").source_url, null);
});

test("assertNoSecrets throws when key or GAR address leaks", () => {
  assert.throws(() => assertNoSecrets('{"a":"key-123456"}', ["key-123456"]));
  assert.throws(() => assertNoSecrets('{"a":"http://localhost:8000/p"}', ["http://localhost:8000"]));
  assert.doesNotThrow(() => assertNoSecrets('{"a":"ok"}', ["key-123456", "http://localhost:8000"]));
});

test("buildLabels: value -> label только по известным полям", () => {
  const l = buildLabels({ fields: [
    { key: "direction", options: [{ value: "law", label: "Право" }] },
    { key: "secret", options: [{ value: "x", label: "y" }] },
  ] });
  assert.deepEqual(l.direction, { law: "Право" });
  assert.equal(l.secret, undefined);
  assert.deepEqual(l.age, {});
});

test("splitCollection: полный текст уходит из списка в details", () => {
  const { list, details } = splitCollection([
    { document_id: "a", full_text: "текст" },
    { document_id: "b", summary: "кратко" },
  ]);
  assert.deepEqual(list, [{ document_id: "a", has_full_text: true }, { document_id: "b", summary: "кратко" }]);
  assert.deepEqual(details, { a: { full_text: "текст" } });
});

test("buildCollection: dropped группирует отброшенные по домену и причине", () => {
  const docs = [doc("a", "granted"), doc("c", "denied"), doc("d", "not_set"), doc("d2", "not_set"), doc("e")];
  const { dropped } = buildCollection(docs, {});
  assert.deepEqual(dropped, [
    { domain: SRC("not_set"), permission: "not_set", count: 2 },
    { domain: "", permission: "not_set", count: 1 },
    { domain: SRC("denied"), permission: "denied", count: 1 },
  ]);
});

test("buildCollection: stats считает опубликованные и отброшенные по домену", () => {
  const docs = [doc("a", "granted"), doc("b", "granted"), doc("c", "not_set"), doc("e")];
  const { stats } = buildCollection(docs, {});
  assert.deepEqual(stats, [
    { domain: "", published: 0, dropped: 1 },
    { domain: SRC("granted"), published: 2, dropped: 0 },
    { domain: SRC("not_set"), published: 0, dropped: 1 },
  ]);
});
