# ds_site — CURRENT_STATUS

## Готово
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

## Инфраструктура
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
- См. открытые issues: #12, #13, #14 (+#15/#16/#17), #7, #8
