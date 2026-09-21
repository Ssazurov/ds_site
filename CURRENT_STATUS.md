## 2026-09-19 — Issues #44, #45, #50, #51, #48, #52, #53 (эпик #43): навигация/шапка/статьи/новости/ссылки

- #44+#45 (PR #64, Closes оба): Header.tsx — убран "Помощник" из верхнего
  меню (route /assistant остаётся, используется из /articles), порядок
  Главная/Новости/Библиотека (dropdown: Статьи/Глоссарий/Ссылки,
  click/hover, aria-haspopup/expanded, закрытие по клику снаружи),
  aria-current для активного пункта.
  ВАЖНО: старый PR #57 (та же ветка `feat/nav-order-44`) содержал корректный
  Header.tsx-diff, но был создан от устаревшего main и конфликтовал с уже
  смерженными #58/#59/#62/#63 (откатывал их правки в articles/links/news/
  ChatAssistant/layout.tsx). Закрыт как superseded — в main попал только
  Header.tsx+globals.css кусок, точечно перенесённый в новую ветку.
- #53 (PR #62): links/page.tsx — карточка ресурса по образцу /articles,
  без eyebrow/lede, фильтры + "Сбросить фильтры". Поле "теги" не
  показывается — нет в ResourceLinkRecord, см. #61.
- #52 (PR #63): news/page.tsx — те же фильтры direction/category/age/
  target_audience и убрана шапка eyebrow/lede. Фильтр по тегам не
  реализован по той же причине (#61, нужен ADR на расширение контракта
  метаданных).
- #50 (PR #58): ChatAssistant.tsx — шапка "«Солнечный» мир" / "Знания о
  солнечных людях с синдромом Дауна", убраны eyebrow/lede, label "Ваш
  вопрос" перенесён в placeholder (aria-label сохранён), убран
  `<legend>Формат ответа</legend>`.
- #51 + #48 (PR #59): articles/page.tsx — doc_type жёстко зафиксирован как
  "article" (аналогично news/page.tsx), убран из FILTER_ORDER; убраны
  eyebrow "Библиотека"/lede/`<legend>Фильтры</legend>`; пагинатор и
  "Показывать по" заменены на накопительную кнопку "Показать ещё".
- Ни один PR не проверялся CLI-сборкой (`npm run build`/`dev`) в этой
  сессии — известное ограничение WSL/npm UNC-interop, нужна ручная
  проверка перед мёржем.

## 2026-09-16 — Issue #16 (эпик #14): публичная страница /glossary

- Бэкенд уже готов (ds_search эпик #126/#127/#128/#131): 64 термина+сокращения
  проиндексированы в GAR как `doc_type=glossary_term`/`glossary_abb`.
- Добавлен `app/glossary/page.tsx` по паттерну `/links`: фильтры
  direction/category/age/target_audience + тип (термин/сокращение), список
  отсортирован по алфавиту. Определение подгружается лениво по клику через
  `/api/gar/documents/{id}/content` (canonical_md), т.к. в metadata текста
  определения нет — только заголовок-термин.
- Пункт "Глоссарий" добавлен в `components/Header.tsx`.
- `tsc --noEmit` и `eslint` чистые. PR #39 (Closes #16), смёржен.
- Issue #15 (дубль эпика #14, тот же скоуп что #37) закрыт как уже
  реализованный в PR #38.
- Осталось по эпику #14: issue #17 (/assistant, RAG-чат).

## 2026-09-16 — Issue #37: публичная страница /news

- Новостной блок (ds_search Epic #44) публикует новости в GAR как
  `doc_type=news`, но на сайте не было роута — раздел был недоступен
  пользователям.
- Добавлен `app/news/page.tsx`: лента новостей через `/api/gar/documents`
  (тот же прокси, что у "Статьи", ADR-0003) с фикс. `doc_type=news`,
  сортировка по `metadata.publish_date` на клиенте (backend `/public/documents`
  сортировку по дате не поддерживает). Пункт "Новости" добавлен в
  `components/Header.tsx`.
- Дедуп новостей между источниками отложен — issue ds_search#155.
- Не проверено CLI-сборкой (`npm run build`) из-за конфликта npm
  (Windows interop) c UNC-путём WSL в этой сессии — рекомендуется
  `npm run dev -- -p 3001` вручную перед мёржем.

## 2026-09-15 -- release 0.1.21 closed; next 0.1.22

- Project #1 release coordination completed; contextual article facets are on main. Release notes published; next target is 0.1.22.

# ds_site — CURRENT_STATUS

## 2026-09-15 — Issue #12 GAR public metadata labels

- Site already consumes `/api/gar/metadata-fields` and keeps technical slug
  values in filter URLs; no local translation dictionary was added.
- The GAR backend implementation is tracked in
  `gar-core-api#320`: `GET /public/metadata-fields` returns active fields and
  active `value -> label` options through the existing public API key and ACL.
- URL/filter synchronization now derives request state directly from
  `searchParams`, avoiding cascading state updates during effects.
- Site checks pass: `npm run lint`, `npx tsc --noEmit`, and `npm run build`.

## 2026-09-15 — Контекстные категории направления

- `/articles` получает фасеты с учётом остальных фильтров: после выбора направления список категорий содержит только категории этого направления.
- Смена направления сбрасывает несовместимую категорию; ссылка на категорию в карточке сохраняет направление.

## 2026-09-14 -- ADR-0009: ds_site вне scope

- Root ADR: `ds/docs/adr/0009-real-source-recrawl-reload.md`.
- Requirements: `ds/docs/requirements/real-source-recrawl-reload.md`.
- Сайт не меняется: стабильный GAR `document_id` сохраняет ссылки и public
  contract. Следующий slice выполняют ds_search crawler owner, затем
  ds_ingestion orchestration owner; ds_site изменений не принимает.

## В работе
(пусто)

## Готово
- Issue #23 (root ADR-0007, ds_ingestion#7): кнопка "Полная перезагрузка
  статьи из источника" в админке -> POST /reload в ds_ingestion. Закрыто
  в релизе 0.9.
- Issue #24: пагинация `/articles` (page/per_page, контролы "показывать по",
  первая/пред/след/последняя), состояние синхронизировано с URL.
  Backend: gar-core-api PR #318 (page/per_page в GET /public/documents).
- Issue ds_search#138 (ADR-0006, PR #21): роут `/articles/[id]` — полный текст
  canonical_md + автор + ссылка на источник, если материал скачан по лицензии
  (`assets.canonical_md.available`); иначе карточка метаданных + ссылка,
  без текста. Прокси `app/api/gar/documents/[id]` и `.../content`.
  Заголовки карточек в `/articles` теперь ссылки на `/articles/[id]`.
- Next.js 16 скелет (app/api/gar/chat, app/api/gar/scope-tree — серверный прокси к GAR /public/*)
- lib/gar.ts: X-Public-Api-Key + GAR_URL, вариант B (localhost, без Cloudflare Zero Trust)
- Прокси проверен вживую: scope-tree (27 документов, dataset sindrom-dauna) и chat (ответ с источниками) — оба 200 OK
- Issue #35: UI передаёт `response_mode` (`full`/`summary`) и действия `action`
  через тот же `/api/gar/chat`: раскрытие источников, дополнительный retrieval с
  `exclude_ids`, веб-поиск и упрощение формулировки. Карточки источников скрыты
  до явного действия пользователя.
- Issue #32: главная страница теперь отправляет запросы к `/api/gar/chat` и показывает ответ GAR.
  Источники агрегируются в карточки с заголовком, ограниченной аннотацией и ссылкой;
  полный текст источника не выводится. Используются `document_name`, `metadata.title`,
  `original_url` и `canonical_md_url` из существующего `sources[]` контракта.
- Issue #32 checks: `npm run lint`, `npm run build`, `git diff --check`.

## Инфраструктура: docker compose (актуально с 2026-09-16, эпик gar-core-api#323)
- Весь стек поднимается `docker compose up` из `~/projects/deploy/docker-compose.yml`
  (сеть `gar-net`): образы билдятся из `../gar-core-api`, `../gar-admin-ui`,
  `../ds/ds_ingestion`, `../ds/ds_search`, `../ds/ds_site`.
- Контейнеры/порты: `deploy-gar-core-api-1` **8000** (не 8100 — старый способ
  запуска через `start-chat-site.sh` устарел), `deploy-gar-admin-ui-1` 3000,
  `deploy-ds-ingestion-1` 8200, `deploy-ds-search-1` (streamlit) 8501,
  `deploy-ds-site-1` 3001. Postgres — `docker-db_postgres-1:5432` (БД `gar_core`,
  gar-core-api ходит туда через `host.docker.internal`), Qdrant —
  `docker-qdrant-1:6333`.
- X-Public-Api-Key не менялся, `NEXT_PUBLIC_GAR_DATASET_ID` задаётся build-арг в
  compose (`81f35f18-8d32-458e-bf33-ddb68349e015`).
- НАХОДКА (2026-09-16): в БД `gar_core` таблицы `glossary_terms` и
  `resource_links` пустые (0 строк) — `/public/glossary-terms` и
  `/public/resource-links` отдают `[]` даже с `dataset_id`. В `entities` нет
  `entity_type='glossary_term'` вовсе (миграция 1647 entities → glossary_terms
  из ADR-0004, п. Последствия, похоже не выполнена или данные не в этом
  окружении). Блокирует #8 (pull-синк) содержательной проверкой — сам синк
  можно закодировать, но синкать пока нечего.

## Инфраструктура (устарело, см. docker compose выше)
- GAR_PUBLIC_API_KEY сгенерирован, добавлен в gar-core-api/.env и ds_site/.env.local
- ACL выдан: `python -m scripts.seed_public_acl 81f35f18-8d32-458e-bf33-ddb68349e015` → public-site-readonly, dataset sindrom-dauna

## Локальный запуск
- GAR API + gar-admin-ui (канонический способ): `bash ~/projects/gar-admin-ui/scripts/start-chat-site.sh`
  → core-api на 127.0.0.1:8100, admin-ui на 127.0.0.1:3000.
- ds_site (отдельно, порт 3001): `cd ~/projects/ds/ds_site && npm run dev -- --port 3001`
  (ВАЖНО: в WSL Windows npm/node лезет в PATH раньше — если "next dev" падает
  через cmd.exe/UNC error, использовать явно
  `$HOME/.nvm/versions/node/<version>/bin/node node_modules/next/dist/bin/next dev --port 3001`)
- Сайт: http://localhost:3001

## Инфраструктура: находки сессии 2026-09-12
- Локально одновременно работают: gar-admin-ui (порт 3000, cwd
  ~/projects/gar-admin-ui) и ds_site (порт 3001, cwd ~/projects/ds/ds_site) —
  разные приложения, оба нужны, порты не путать.
- Канонический gar-core-api поднимается скриптом
  `gar-admin-ui/scripts/start-chat-site.sh` на порту **8100** (не 8000).
  ds_site/.env.local был указан на 8000 — исправлено на
  `GAR_URL=http://localhost:8100`. Также добавлена
  `NEXT_PUBLIC_GAR_DATASET_ID=81f35f18-8d32-458e-bf33-ddb68349e015`
  (без неё страница /articles не делает запрос — "не настроен идентификатор").
- ВНИМАНИЕ: `start-chat-site.sh` делает `pkill -f "next dev"` без привязки к
  порту — потенциально может убить dev-сервер ds_site (3001) при запуске
  скрипта из gar-admin-ui. В этот раз не убил, но это race, а не гарантия.
- `/api/gar/documents` теперь отвечает 200 (раньше 502 из-за не поднятого
  core-api), но возвращает `total: 0` — см. ниже, это не баг ds_site.

## Решено (2026-09-12): датасет sindrom-dauna больше не пуст
- Было: `gar_core.documents` для `dataset_id=81f35f18-8d32-458e-bf33-ddb68349e015`
  (sindrom-dauna) содержал 0 строк — ingestion прерывался на середине.
- Сейчас: 4 документа (`status: indexed`): alisa-i-chudesa,
  bez-oglyadki-na-diagnoz, glossary, links. `/public/documents` и
  `/api/gar/documents?dataset_id=...` отдают `total: 4` с facets по
  age/direction/category/target_audience. См. ds_search#128,
  ds_ingestion#4.
- `ds_site/scripts/start-ds-site.sh` тоже убивает по `pkill -f
  "uvicorn main:app"` уже работающий core-api — тот же риск, что и у
  `start-chat-site.sh` ниже, только с другой стороны (ds_site-скрипт
  бьёт по core-api). После него `.venv/bin/python -m uvicorn main:app
  --host 127.0.0.1 --port 8100` из `~/projects/gar-core-api` поднимает
  его обратно вручную.
- `npm run dev` под WSL иногда резолвит `next`/`npm` в Windows-бинарник
  (`/mnt/c/Program Files/nodejs/npm`) вместо nvm — лечится явным
  `export PATH="$HOME/.nvm/versions/node/<version>/bin:$PATH"` перед
  запуском. Также надёжнее стартовать через `setsid`/detached-процесс —
  короткоживущая обёртка `nohup ... &` внутри одного `wsl.exe`-вызова
  иногда обрывает next dev до того, как Turbopack докомпилирует первый
  запрошенный роут.

## Сессия 2026-09-13: аудит видения сайта
- Сверка `docs/archive/обновленное_видение_сайта.md` с ADR/issues: почти всё
  покрыто (Epic #23/#31/#44/#100/#126), кроме админ-части сайта — заведён
  ADR-0005 (ds/docs/adr) + Epic ds_search#132.
- Найден и пофикшен баг: карточки /articles показывали "Ссылка недоступна",
  т.к. читали `original_url`/`canonical_md_url`, а ds_ingestion пишет
  `source_url` (adapter/pipeline.py). PR #19 (Closes #18), временный
  хардкод RU-подписей direction/category (issue #12 — нужен публичный
  словарь меток из gar-core-api).
- Меню (Header.tsx): только Главная/Статьи/Ссылки — Новости/Глоссарий/
  Помощник не заведены как страницы, хотя бэкенд готов. Epic #14
  (подзадачи #15 /news, #16 /glossary, #17 /assistant).
- Заведена #13: просмотр полного текста скачанной статьи на /articles
  (сейчас только внешняя ссылка на источник).

## Issue #6 (PR #20): групповой выбор статей -> scope для GAR-чата
- /articles: чекбокс на карточке + sticky-панель "Выбрано N" (Спросить/Очистить).
- Scope (document_ids + titles) кладётся в sessionStorage (`ds-chat-scope`),
  главная читает при монтировании (lazy useState, без setState в эффекте —
  иначе react-hooks/set-state-in-effect ломает lint), показывает бейдж со сбросом.
- /api/gar/chat: добавлены `filters.document_ids` + `scope_source: "manual"`
  (контракт gar-core-api/schemas/chat.py, ADR-042) поверх scope-tree (#32/#35).
- npm run lint, npm run build — ok.

## Дальше
- Верстать страницы (глоссарий/чат-виджет) поверх прокси
- См. открытые issues: #13, #14 (+#15/#16/#17), #7, #8

## Issue #12 (ADR-0012): RU-labels metadata из GAR, не хардкод
- Закрыт хардкод `DIRECTION_LABELS` (2/11 значений direction, category не
  покрыт вообще) в `articles/page.tsx`; `links/page.tsx` вообще не имел
  словаря — показывал сырые slug'и.
- `lib/gar/client.ts`: `garMetadataFields(datasetId)` — прямой GET
  `{GAR_URL}/datasets/{id}/metadata-fields` (admin-роут, не `/public/*`;
  публичного эндпоинта для этого в gar-core-api нет), `X-User-ID: admin-ui`
  (env `GAR_ADMIN_USER_ID`).
- `app/api/gar/metadata-fields/route.ts` — серверный прокси с TTL-кэшем 5 мин.
- `lib/gar/labels.ts` — клиентский хук `useMetadataLabels(datasetId)`,
  module-singleton fetch, `ruLabel(key, value)`, fallback на raw value.
- Применено в `articles/page.tsx` (селекты фильтров + `MetadataLinks`) и
  `links/page.tsx` (селекты + карточки).
- `tsc --noEmit` — чисто.


## Issue #17 (PR #40): /assistant — RAG-чат с пикером статей по scope-tree
- `components/ChatAssistant.tsx`: логика чата вынесена из `app/page.tsx`
  (без изменений контракта `/api/gar/chat`), плюс встроенный `ScopePicker`
  поверх уже существующего `/api/gar/scope-tree` (product -> doc_type ->
  documents), сворачиваемый ("Ограничить чат конкретными статьями").
- `app/page.tsx` и `app/assistant/page.tsx` — реэкспорт `ChatAssistant`;
  оба URL показывают один и тот же чат.
- `lib/gar/types.ts`: типы `ScopeTreeResponse/ScopeProduct/ScopeDocType/
  ScopeDocument`.
- Пикер и ручной выбор с /articles (issue #6) используют общий
  sessionStorage-ключ `ds-chat-scope` — выбор статей на /articles тут же
  виден в /assistant. Кнопка "Спросить" на /articles теперь ведёт на
  /assistant (было `/`).
- Header.tsx: пункт меню "Помощник".
- `npm run lint`, `npm run build` — ok.
- Epic #14 (Новости/Глоссарий/Помощник) закрыт — все три подзадачи (#15,
  #16, #17) реализованы и смёржены.

## 2026-09-16 -- issue #8: glossary/links на pull-sync кэше
- `app/glossary/page.tsx`, `app/links/page.tsx` переведены с live-запросов
  `/api/gar/documents` на `/api/glossary-links` (файловый кэш
  `data/glossary-links-cache.json`, читает `lib/gar/glossary-links-cache.ts`,
  пишет `scripts/sync-glossary-links.mjs`, ADR-0004 п.3).
- Термин-карточки (`glossary`) больше не ходят в GAR за определением при
  клике — текст берётся сразу из кэша (`term.definition`).
- Если синк ещё не запускался — страницы показывают "Синк ещё не
  запускался", а не ошибку (500/пусто).
- `tsc --noEmit` чисто. PR #42 squash-merged, issue #8 закрыт (auto-close).

- 2026-09-19: ADR-0015 (root `ds/docs/adr/0015-document-tags-field.md`): поле `tags` в метаданных; issue ds_site#61 (родитель), дочерние в gar-core-api и ds_ingestion.

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
