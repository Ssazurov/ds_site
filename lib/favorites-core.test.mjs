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
