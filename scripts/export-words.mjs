// scripts/export-words.mjs
// Выгрузка каталога слов/карточек из ds_words в ds_site (ds_site#27, ADR-0027).
// Источник правды — ds_words (ds_words#1): dist/words.ru.json (список слов) +
// registry/images.json (статус генерации картинок). Запускается ЛОКАЛЬНО:
// node scripts/export-words.mjs [--words-dir ../../ds_words] [--out public/words]
// Секретов не содержит — результат коммитится в репозиторий (как ADR-0018,
// но без обращения к GAR/ключам).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const CATEGORY_LABELS = {
  food: "Еда", household: "Быт", clothes: "Одежда", furniture: "Мебель",
  dishes: "Посуда", body: "Тело", family: "Семья и люди", animals: "Животные",
  transport: "Транспорт", actions: "Действия", feelings: "Чувства", places: "Места",
  colors: "Цвета", descriptors: "Признаки", health: "Здоровье",
  numbers_shapes: "Числа и фигуры", outside: "На улице", people: "Люди",
  prepositions_quantity: "Предлоги и количество", pronouns_questions: "Местоимения и вопросы",
  school: "Школа", social: "Общение", sport: "Спорт", time: "Время",
  toys_games: "Игрушки и игры", core_verbs: "Глаголы", sounds: "Звуки",
  health_routines: "Режим и здоровье",
};

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : def;
}

async function main() {
  const wordsDir = path.resolve(arg("--words-dir", "../../ds_words"));
  const outDir = path.resolve(arg("--out", "public/words"));
  const imagesOut = path.join(outDir, "images");

  const words = JSON.parse(await readFile(path.join(wordsDir, "dist", "words.ru.json"), "utf-8")).words;
  let registry = {};
  try {
    registry = JSON.parse(await readFile(path.join(wordsDir, "registry", "images.json"), "utf-8"));
  } catch { /* реестр недоступен — все карточки без картинок */ }

  await mkdir(imagesOut, { recursive: true });

  let withImage = 0;
  const items = [];
  for (const w of words) {
    const img = registry[w.id];
    let image = null;
    if (img?.status === "generated" && img.path) {
      const src = path.join(wordsDir, img.path);
      const dst = path.join(imagesOut, `${w.id}.webp`);
      try {
        await sharp(src).resize(480, 480, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toFile(dst);
        image = `/words/images/${w.id}.webp`;
        withImage++;
      } catch (e) {
        console.warn(`${w.id}: не удалось обработать картинку (${e.message})`);
      }
    }
    items.push({
      id: w.id, lemma: w.lemma, pos: w.pos,
      category: w.category, categoryLabel: CATEGORY_LABELS[w.category] ?? w.category,
      age: w.age, prio: w.prio ?? 2, image,
    });
  }

  const categories = [...new Set(items.map((w) => w.category))]
    .map((id) => ({ id, label: CATEGORY_LABELS[id] ?? id }))
    .sort((a, b) => a.label.localeCompare(b.label, "ru"));

  const body = JSON.stringify({
    generated_at: new Date().toISOString(),
    count: items.length,
    with_image: withImage,
    categories,
    words: items,
  });
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "data.json"), body, "utf-8");
  console.log(`слов: ${items.length}, с картинкой: ${withImage}, категорий: ${categories.length}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(String(e.stack ?? e)); process.exit(1); });
}
