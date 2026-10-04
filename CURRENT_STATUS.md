## Архив

- Записи 2026-09-12 — 2026-09-19 вынесены в [CURRENT_STATUS-2026-09-12_2026-09-19.md](docs/archive/current-status/CURRENT_STATUS-2026-09-12_2026-09-19.md)

## 2026-09-19 — Issue #75: /news/[id]
- Карточка новости: заголовок-ссылка, превью (line-clamp 4), «Читать полностью». Новая страница app/news/[id]/page.tsx по образцу articles/[id] (canonical_md). PR #76. Проверка: сборка образа.

## 2026-09-19 — Issue #77: /glossary и /links читают GAR напрямую
- ADR-0016 (root `ds/docs/adr/`) заменяет ADR-0004 п.3: кэш `data/glossary-links-cache.json` был пуст (таблицы glossary_terms/resource_links в GAR пусты, термины лежат документами `glossary_term|glossary_abb|link`).
- `lib/gar/documents-by-type.ts` (`fetchAllDocuments`, `metaStr`); страницы читают `/api/gar/documents?doc_type=...`; определение термина — лениво из `/content`; URL ссылки — `metadata.source_url`.
- Удалены: `lib/gar/glossary-links-cache.ts`, `/api/glossary-links`, `scripts/sync-glossary-links.mjs`, npm-скрипт `sync:glossary-links`. Секции про кэш/синк выше устарели.
- Проверка: в WSL нет node — тип-чек/сборка в образе.

- 2026-09-19: карточки /articles и /news — чекбокс в строке заголовка, заголовок 21px без ссылки, «Читать →», убран «· Статья» (#81). Пересобран ds-site, build ok.

## Редизайн: единый стиль (ds_site#85)
- Токены/тёмная тема и стили карточек и фильтров: `app/globals.css` (блок «ds_site#85»). Акцент синий, карточки с тенью и hover-подъёмом, без фото.
- `components/FilterBar.tsx` — общий блок фильтров (плашки «Тема» = direction, поле «Категория» с поиском, ⚙ только пиктограмма → «Возраст»/«Аудитория», активные фильтры). Подключён в /articles, /news, /links, /glossary (в глоссарии + плашки «Термины/Сокращения»).
- `lib/format.ts`: `formatDate` (год только для прошлых лет), `readingMinutes` (~200 слов/мин), `metaReadingMinutes` (из metadata.reading_time_min/word_count).
- Время чтения: в карточках /articles показывается, если есть в metadata; на странице статьи считается автоматически по тексту. Для новостей не выводится. Запись reading_time_min при индексации — отдельная задача (ds_ingestion).
- Проверка: git diff --check, docker build ds-site (type-check) без ошибок, контейнер пересобран.

## 20.09.2026 — ds_site#87: разработчик
- `components/Footer.tsx`: «Разработчик: Сазуров С.В.» → `/about#developer`; `app/about/page.tsx`: первым подраздел «О разработчике» (текст, ФИО, почта, VK, TG), placeholder контакта убран. Проверка: git diff --check.

## 20.09.2026 — правки навигации и /about
- `app/layout.tsx`: над меню строка «Проект «Солнечный мир»» на всех страницах (`.project-line`, globals.css).
- `components/Header.tsx`: меню теперь Новости / Помощник (`/`, бывш. «Главная») / Библиотека / О нас; `ChatAssistant.tsx`: убраны заголовок «Солнечный» мир и lede, остался sr-only h1 «Помощник».
- `app/about/page.tsx`: h1 в одну строку (`.about-header`), ФИО и контакты в подразделе «Контакты» (h3, `#contacts`), карта сайта в порядке меню; в globals.css добавлены отступы `p` и стиль `h3` для `.about-text` (Tailwind preflight обнулял margin).
- Проверка: контейнер `deploy-ds-site-1` пересобран (`docker compose up -d --build ds-site`), на :3001 строка проекта и «Контакты» на месте. Замечание: tsc/eslint видят ранее существовавшие ошибки (`.next/types` glossary-links, `set-state-in-effect` в links/page.tsx) — не из этой задачи.

- /about: «Зачем это нужно» → «Цель проекта»; контакты — ссылки-плашки (`.contact-list a`, стиль как `.tag`), ссылки в `.about-text` — accent-dark/bold; контейнер пересобран.

- Помощник (`ChatAssistant.tsx`): видимый заголовок «Помощник» (`chat-header` + h1) вместо sr-only, как на других страницах.

- globals.css: отступы вокруг заголовка страницы уменьшены вдвое (`.chat-shell` padding-top 64→32, mobile 36→18; `.chat-header` margin-bottom 40→20; h1 margin 12/14→6/7). Контейнер пересобран.

## 2026-09-20 — issue #92: выгрузка контента из GAR в JSON с фильтром по разрешению (ADR-0018)
- `scripts/export-content.mjs` (локально, `npm run export:content`, опц. `--out`): статьи/новости/глоссарий/ссылки из GAR `/public/*` -> `data/export/{articles,news,glossary,links}.json` + `manifest.json` (счётчики отброшенных без названий). `/data/export/` в .gitignore.
- Логика в `scripts/export-lib.mjs`: публикуются только `publish_permission` in (not_required, granted); not_set/denied/неизвестное/пустое — отброшено (fail closed). Краткое содержание = description (иначе первые ~400 симв. текста); `full_text` только для granted; ссылка на источник — только внешний source_url/original_url (canonical_md_url GAR не выгружается); метаданные по белому списку; `assertNoSecrets` прерывает выгрузку, если ключ/адрес GAR попал в вывод.
- Тесты: `npm run test:export` (node --test, 7 pass). Пробный прогон по живому GAR: 0 выгружено, все документы not_set (поле publish_permission ещё не заполнено — ждёт ds_ingestion#35/реестр источников).


## 2026-09-20 — issue #94: флаг «Помощник» и настройки внешнего GAR (ADR-0018)
- `lib/assistant-flag.ts`: хук `useAssistantEnabled()` (null до гидратации). Приоритет: `NEXT_PUBLIC_ASSISTANT_ENABLED` (1/true/0/false, внешняя сборка) главнее localStorage `ds-assistant-enabled` (страница `/settings`); по умолчанию выключен. URL внешнего GAR — localStorage `ds-external-gar-url` (`useExternalGarUrl`/`getExternalGarUrl`; в запросы чата пока не подключён — нужен статической сборке #95+).
- `/settings` (`app/settings/page.tsx`, в меню нет): чекбокс флага (заблокирован, если задан env) и поле URL GAR.
- Флаг выключен: Header скрывает «Помощник»; `/` и `/assistant` через `components/AssistantGate.tsx` редиректят на `/news`; на `/articles` скрыты флажки выбора и панель «Спросить по выбранным»; пункт «Помощник» в «О нас» скрыт (`AssistantAboutItem`).
- Проверки: `tsc --noEmit` чисто; `npm run lint` — 2 ошибки в glossary/links (`set-state-in-effect`), были до этой задачи, в новом коде нет.


## 2026-09-20 — issues #93 + #95: статическая сборка и публикация на GitHub Pages (ADR-0018)
- Режим внешней сборки: `NEXT_PUBLIC_STATIC_EXPORT=1` (`next.config.ts`: `output: "export"`, `basePath` из `NEXT_PUBLIC_BASE_PATH`, `trailingSlash`, `images.unoptimized`, `pageExtensions: ["tsx"]` — так `app/api/**/route.ts` не попадают в экспорт). Внутренняя сборка (standalone + GAR-прокси) без изменений. `NEXT_DIST_DIR` задаёт отдельный distDir (при экспорте HTML лежит прямо в нём: `.next-static/`), чтобы не затирать `.next`.
- Данные: `lib/gar/data.ts` — единая точка чтения для страниц (`getDocuments/getDocumentDetail/getDocumentContent/getLabels/searchCollection`). Внутри — `/api/gar/*` как раньше; в статике — `/data/*.json`, фильтры/фасеты/пагинация на клиенте, поиск MiniSearch (динамический import; нормализация: нижний регистр, ё→е; prefix + fuzzy 0.2; AND; title x3). Поле поиска (`components/SearchBox.tsx`, только статика): `?q=` на статьях и новостях, локальное на глоссарии.
- Страницы `articles/[id]`, `news/[id]` разделены: серверный `page.tsx` (`generateStaticParams` из `data/export/*.json`, `lib/static-ids.ts`; во внутренней сборке пусто) + клиентские `ArticleView/NewsView`. В статике при отсутствии полного текста показывается краткое содержание + ссылка на источник; на карточках глоссария — ссылка «Источник». `noindex,nofollow` в layout (только статика).
- `scripts/export-content.mjs` теперь пишет ещё `labels.json` (словарь подписей); в записи добавлен `doc_name`. `scripts/prepare-static.mjs`: `data/export` → `public/data` (списки без `full_text`, полный текст — `<coll>/<id>.json`, `has_full_text`); `/public/data/` в .gitignore.
- Публикация (`npm run publish:pages`, `scripts/publish-pages.mjs`; `--skip-export`, `--dry-run`, `npm run build:static` = dry-run без выгрузки): выгрузка → раскладка → `next build` (ассистент выключен, `NEXT_PUBLIC_GAR_DATASET_ID=static`) → проверка вывода на ключ/адрес GAR/id набора → `.nojekyll` → force-push orphan-ветки `gh-pages` → включение Pages (source gh-pages) при необходимости. GitHub Action не используется.
- Проверки: `test:export` 9 pass; `tsc --noEmit` чисто; eslint — только 2 старые ошибки `set-state-in-effect` (glossary/links); внутренняя сборка (`NEXT_DIST_DIR=.next-check next build`) проходит; статическая сборка на тестовых данных: 14 страниц, статика отдаётся под `/ds_site/`, robots noindex, 129 файлов без секретов; MiniSearch проверен отдельно («елка» находит «Ёлка», префикс, опечатка). Браузерный прогон UI не делался.
- Реальные данные: все документы `not_set` → выгрузка пуста, сайт публикуется пустым, пока в ds_search/ds_ingestion не проставлено разрешение источникам.
- Итог: PR #99 + #100 (заглушка `_empty` в `generateStaticParams` при пустой выгрузке — без неё `next build` падал). Первая публикация выполнена 2026-09-20: https://ssazurov.github.io/ds_site/ (Pages уже были включены, source gh-pages); сайт пока пустой (выгружено 0). Перед публикацией не забывать `git checkout -- tsconfig.json` — Next дописывает в него `.next-static/types`.

### ds_site#96 — инструкция по обновлению внешнего сайта (2026-09-20)
- README.md: раздел «Внешний сайт (GitHub Pages)» — обновление (кнопка в ds_search / npm run publish:pages), проверка публикации, флаг Помощника, отзыв. Только документация, код не менялся.

### ds_site#103 — Избранное статей (2026-09-21)
- Решение: localStorage в браузере (без сервера/cookie anon_id/БД — работает и в статике publish-pages); merge с профилем и хранение в GAR — отдельная будущая задача при появлении авторизации. ADR не нужен.
- Код: `lib/favorites-core.mjs` (+`.d.mts`, тесты `favorites-core.test.mjs`), хук `lib/favorites.ts`, `components/FavoriteButton.tsx` (★ toggle; до согласия — подсказка «разрешите cookie»), `components/ConsentBanner.tsx` (текст + «Принять»), страница `app/favorites/` (поиск по названию, сортировка по дате добавления, фильтр «только избранное», пометка «хранится в этом браузере»), ★ в выдаче `app/articles` и на странице статьи, пункт «Библиотека» в Header.
- Проверка: node --test 13/13, tsc и eslint без ошибок. Node в WSL: `~/.nvm/versions/node/v22.23.1/bin` (в /tmp/chk.sh PATH чистится от /mnt/c).

## 2026-09-21 — фильтр доменов на «Статьях» (#105, ADR-0020)
- lib/gar/domain.ts (registrable domain), data.ts (domain=, domains со счётчиками), components/DomainFilter.tsx, app/articles/page.tsx. Работает в static-режиме; live GAR пока не отдаёт domains — блок скрыт.

## 2026-09-24 — publish-pages: падение без git user.name (#107)
- Причина: `git config user.name` даёт код 1 при незаданном ключе (контейнер ds_search), `out()` бросал исключение до применения запасных значений.
- Фикс: `scripts/publish-pages.mjs` — мягкое чтение user.name/user.email с запасными значениями. Проверка: `node --check`, реальная публикация из UI прошла успешно.

## 2026-09-28 — Направление/категория на детали и карточке новостей (#118)
- `/news/[id]`: добавлены теги direction и category с ссылками на `/news?direction=...&category=...`, отображаются перед автором/источником.
- `/news` карточка: категория теперь кликабельна (была текстом), ведёт на фильтр по направлению+категории.
- Стили: `a.card-cat:hover` с подчеркиванием.
- Проверка: `npm run build` успешно, типы чистые, контейнер `ds-site` пересобран.
- Примечание: пункт 3 из #118 (проверка данных GAR, `reactualize_metadata.py`) отложен — в GAR нет опубликованных новостей (`doc_type=news`), скрипт работает долго. После появления новостей в базе будет выполнена реактуализация метаданных.

## 2026-09-29 -- issue #119: фильтры /articles как у /news
- `/articles`: FilterBar в режиме titleMode (поиск по названию, Направление/Категория зависимыми select под ⚙, `tree` из useMetadataLabels); чипы направления убраны. Возраст/Аудитория без изменений.
- Динамика: при `q` грузятся все статьи (per_page=100, постранично) и фильтруются на клиенте; без `q` — пагинация 20 + «Показать ещё». Статика: MiniSearch в getDocuments.
- Общая логика вынесена в `lib/title-search.ts` (norm/matchesTitle/filterByTitle), используется в news и articles.
- Сохранено: DomainFilter, избранное, выбор для Помощника, doc_type=article, URL-параметры q/direction/category/age/target_audience/domain.

## 2026-09-29 -- issue #119 (fix): URL-параметры фильтров после прямого захода
- Симптом: после открытия `/articles?domain=...` чипы доменов, «Сбросить домены» и др. не реагировали (то же на `/news?direction=...`).
- Причина: `router.replace` в Next 16 не срабатывал при прямом заходе по URL с query.
- Фикс: `lib/url-state.ts` (`replaceQuery` на `history.replaceState`, относительный `?query`) в `app/articles` и `app/news` (PR #122). `SearchBox.tsx` не менялся.
- Проверка: headless-браузер (playwright из ds-search) — добавление/сброс доменов после прямого захода работает; `ds-site` пересобран. Статическая сборка не проверялась.

## 2026-09-30 — issue #129: пагинация «Показать ещё» на /articles, /news, /links, /glossary (ADR-0025)
- Решения пользователя: кнопка «Показать ещё» (не нумерованные страницы),
  порция 20 везде, глоссарий — алфавитный указатель; вопрос про `q` в GAR
  вынесен на обсуждение (см. ниже).
- Новые файлы: `lib/pagination.ts` (PAGE_SIZE=20, `pageParam`,
  `withPageParam`), `lib/use-document-feed.ts` (хук для страниц на GAR
  /public/documents), `lib/use-paged-list.ts` (хук для наборов в памяти),
  `components/LoadMore.tsx`; CSS `.load-more`, `.az-index`, `.az-group` в
  `app/globals.css`.
- Состояние в URL: `?page=N` — число уже загруженных порций (1 не пишется),
  глоссарий дополнительно `?letter=`. Смена фильтра/поиска сбрасывает `?page=`.
  Восстановление: `?page=1..5` — один запрос (`page=1`, `per_page=20*N`,
  лимит GAR 100), больше — последовательные запросы по 20.
- `/articles`, `/news`, `/links` переведены на `useDocumentFeed`: порция 20,
  кнопка «Показать ещё», подпись «Показано: N из M». `/links` больше не грузит
  все 126 документов — постраничный запрос `doc_type=link`. `/news` вместо
  фиксированных 50. `/articles`/`/news` при клиентском поиске по названию
  грузят весь набор (GAR не принимает `q`) — кнопки в этом режиме нет.
- `/glossary`: набор по-прежнему грузится целиком (нужен для счётчиков
  указателя), показ порциями по 20 с группировкой карточек по первой букве,
  указатель А-Я + «#» с числом терминов, выбор буквы фильтрует список.
  Страница обёрнута в Suspense (использует `useSearchParams`), как /articles,
  /news, /links.
- Проверка: `npx tsc --noEmit`, `npx eslint app components lib` (чисто),
  `npm run build` (16 страниц). ADR: `ds/docs/adr/0025-site-load-more-pagination.md`.
- Известная проблема контракта (не в этом PR): `GET /public/documents` в
  gar-core-api принимает `doc_type` скаляром, поэтому `doc_type=article&doc_type=digest`
  (ADR-0024, ds_site#127) обрабатывается как `doc_type=digest`, и «Статьи» в
  динамическом режиме показывают 0 документов (проверено на работающем API).
  Нужен `list[str]` в gar-core-api.

## 2026-09-30 — задачи на серверный поиск `q` в GAR (ADR-0026, epic gar-core-api#443)
- Контракт серверного поиска по названию зафиксирован в ADR-0026
  (`ds/docs/adr/0026-gar-document-title-search-q.md`): `GET /public/documents?q=`
  (AND по словам, префикс, `lower()`+`ё→е`, только `doc_name`/`metadata.title`,
  `q ≤ 200`), фасеты/`total`/доменные счётчики считаются после `q`.
- Задачи: gar-core-api#444 (реализация `q` + тесты), #446 (live-проверка, замер,
  релиз), ds_site#131 (убрать режим `searchAll` в `lib/use-document-feed.ts`),
  #132 (паритет правил поиска в статическом экспорте).
- До их выполнения на `/articles` и `/news` при поиске действует клиентская
  фильтрация по названию с загрузкой всего набора (см. ADR-0025 п.7).

## 2026-10-01 — issue #131: серверный поиск по названию через GAR (ADR-0026)

Реализация:
- Удалён флаг `searchAll` из `lib/use-document-feed.ts`: параметр `q` теперь всегда передаётся в GAR `/public/documents`
- Серверная фильтрация работает на всём корпусе документов, не ограничена загруженной порцией
- Фасеты (domains, types) и total корректно обновляются для поискового запроса
- Удалён файл `lib/title-search.ts` (не использовался после рефакторинга; `/favorites` использует свою реализацию `filterByTitle` из `lib/favorites-core.mjs`)
- Обновлён ADR-0025: снята оговорка про клиентский поиск, добавлена отметка о серверном `q`

Зависимости:
- gar-core-api#444 (параметр `q` в `/public/documents`) — закрыта 2026-10-01
- ds_site#129 (пагинация, ADR-0025) — реализовано ранее

Верификация:
- Линт чист (`npm run lint`)
- Удалены unused imports `IS_STATIC` из `use-document-feed.ts` и `articles/page.tsx`
- Создана структура docs/adr/ с ADR-0025 и ADR-0026, файл docs/decisions.md

Результат:
- Коммит d2d9230 смержен в main (2026-10-01)
- Финальная доработка (удаление title-search.ts, обновление ADR-0025): коммит будет создан после пересборки

## 2026-10-01 — Issue #132: расширение поиска на keywords и summary

- **Контекст**: статический экспорт использовал MiniSearch с индексацией только
  `title`, но GAR договор (ADR-0026 v2) был расширен на `keywords` + `summary`
  для улучшения UX поиска (находить по ключевым словам и описанию, даже если
  их нет в названии).
- **Изменения** (PR #135, df68952):
  - `lib/gar/data.ts`: `fields: ["title", "keywords", "summary"]` вместо
    `["title"]` — паритет с GAR.
  - Правила поиска остались неизменны: `prefix: true`, `combineWith: "AND"`,
    нормализация `ё → е`, без fuzzy/boost.
  - Обновлён `/home/vector/projects/ds/docs/adr/0026-gar-document-title-search-q.md`
    (v2, 2026-10-01) — расширен список индексируемых полей.
- **Верификация**:
  - TypeScript, lint, build — чистые.
  - Контейнер `ds-site` пересобран (образ 2026-10-01T09:47:04Z), все слои
    кешированы (apt/pip/npm без загрузок).
  - PR #135 смержен в main (d36d34a).
- **Результат**: статический экспорт теперь находит документы по ключевым
  словам и описанию, UX улучшен, паритет с GAR сохранён.
