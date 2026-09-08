# ds_site — CURRENT_STATUS

## Готово
- Next.js 16 скелет (app/api/gar/chat, app/api/gar/scope-tree — серверный прокси к GAR /public/*)
- lib/gar.ts: X-Public-Api-Key + GAR_URL, вариант B (localhost, без Cloudflare Zero Trust)
- Прокси проверен вживую: scope-tree (27 документов, dataset sindrom-dauna) и chat (ответ с источниками) — оба 200 OK

## Инфраструктура
- GAR_PUBLIC_API_KEY сгенерирован, добавлен в gar-core-api/.env и ds_site/.env.local
- ACL выдан: `python -m scripts.seed_public_acl 81f35f18-8d32-458e-bf33-ddb68349e015` → public-site-readonly, dataset sindrom-dauna

## Локальный запуск
- GAR API: `cd ~/projects/gar-core-api && source .venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000`
- ds_site: `cd ~/projects/ds_site && npm run dev` (ВАЖНО: в WSL Windows npm/node лезет в PATH раньше — если "next dev" падает через cmd.exe/UNC error, использовать явно `$HOME/.nvm/versions/node/<version>/bin` и `node node_modules/next/dist/bin/next dev`)
- Сайт: http://localhost:3000

## Дальше
- Верстать страницы (глоссарий/статьи/чат-виджет) поверх прокси
