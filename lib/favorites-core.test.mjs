import test from "node:test";
import assert from "node:assert/strict";
import { parseFavs, addFav, removeFav, sortNewestFirst, filterByTitle } from "./favorites-core.mjs";

test("parseFavs: мусор и дубли", () => {
  assert.deepEqual(parseFavs(null), []);
  assert.deepEqual(parseFavs("{bad"), []);
  assert.deepEqual(parseFavs('{"a":1}'), []);
  assert.deepEqual(parseFavs('[{"id":"a","at":1},{"id":"a","at":2},{"id":5},null]'), [{ id: "a", at: 1 }]);
});

test("addFav не создаёт дублей, removeFav удаляет", () => {
  let l = addFav([], "a", 1);
  l = addFav(l, "a", 2);
  l = addFav(l, "b", 3);
  assert.deepEqual(l, [{ id: "a", at: 1 }, { id: "b", at: 3 }]);
  assert.deepEqual(removeFav(l, "a"), [{ id: "b", at: 3 }]);
});

test("sortNewestFirst не мутирует", () => {
  const l = [{ id: "a", at: 1 }, { id: "b", at: 3 }];
  assert.deepEqual(sortNewestFirst(l).map((e) => e.id), ["b", "a"]);
  assert.equal(l[0].id, "a");
});

test("filterByTitle: регистр и пустой запрос", () => {
  const items = [{ t: "Сон ребёнка" }, { t: "Питание" }];
  assert.equal(filterByTitle(items, "", (i) => i.t).length, 2);
  assert.deepEqual(filterByTitle(items, " СОН ", (i) => i.t), [{ t: "Сон ребёнка" }]);
});

import { favFacets, applyFavFilters, EMPTY_FAV_FILTERS } from "./favorites-core.mjs";

const FI = [
  { id: "a", at: 1, title: "Бета", meta: { direction: "d1", category: "c1", tags: ["x", "y"], publish_date: "2026-01-10" } },
  { id: "b", at: 3, title: "Альфа", meta: { direction: "d2", age: "3-5", tags: "x", publish_date: "2026-03-01", description: "про сон" } },
  { id: "c", at: 2, title: "Гамма", meta: {} },
];

test("favFacets: уникальные отсортированные значения", () => {
  const f = favFacets(FI);
  assert.deepEqual(f.direction, ["d1", "d2"]);
  assert.deepEqual(f.tag, ["x", "y"]);
  assert.deepEqual(f.age, ["3-5"]);
});

test("applyFavFilters: фильтры, даты, поиск по описанию, сортировка", () => {
  const ids = (f) => applyFavFilters(FI, { ...EMPTY_FAV_FILTERS, ...f }).map((i) => i.id);
  assert.deepEqual(ids({}), ["b", "c", "a"]);
  assert.deepEqual(ids({ sortDir: "asc" }), ["a", "c", "b"]);
  assert.deepEqual(ids({ direction: "d1" }), ["a"]);
  assert.deepEqual(ids({ tag: "x", sortBy: "title", sortDir: "asc" }), ["b", "a"]);
  assert.deepEqual(ids({ dateFrom: "2026-02-01" }), ["b"]);
  assert.deepEqual(ids({ dateTo: "2026-02-01" }), ["a"]);
  assert.deepEqual(ids({ q: "сон" }), ["b"]);
  assert.deepEqual(ids({ sortBy: "publish_date", sortDir: "desc" }), ["b", "a", "c"]);
});
