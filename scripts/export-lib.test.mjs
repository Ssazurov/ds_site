// node --test scripts/  (ds_site#92)
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertNoSecrets, buildCollection, buildRecord, isPublishable, needsContent, permissionOf, summarize,
} from "./export-lib.mjs";

const doc = (id, perm, extra = {}) => ({
  document_id: id, doc_name: `Doc ${id}`,
  metadata: { ...(perm === undefined ? {} : { publish_permission: perm }), ...extra },
});

test("filter: only not_required and granted are publishable", () => {
  assert.equal(isPublishable({ publish_permission: "not_required" }), true);
  assert.equal(isPublishable({ publish_permission: "granted" }), true);
  for (const p of ["not_set", "denied", "Granted", "yes", "", null, undefined]) {
    assert.equal(isPublishable({ publish_permission: p }), false, String(p));
  }
  assert.equal(isPublishable({}), false);
  assert.equal(permissionOf({}), "not_set");
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
  assert.deepEqual(r.metadata, { direction: "law" });
  assert.equal(buildRecord(doc("b", "granted", { canonical_md_url: "http://localhost:8000/x.md" }), "t").source_url, null);
});

test("assertNoSecrets throws when key or GAR address leaks", () => {
  assert.throws(() => assertNoSecrets('{"a":"key-123456"}', ["key-123456"]));
  assert.throws(() => assertNoSecrets('{"a":"http://localhost:8000/p"}', ["http://localhost:8000"]));
  assert.doesNotThrow(() => assertNoSecrets('{"a":"ok"}', ["key-123456", "http://localhost:8000"]));
});
