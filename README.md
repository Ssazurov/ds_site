# ds_site
Сайт для родителей детей с СД и специалистов: глоссарий, ссылки на ресурсы,
статьи + RAG-чат. Данные и поиск — через GAR API, свой контент не хранит.
Без встроенной админки: управление контентом (в т.ч. черновики новостей)
и публикация — в `ds_search/ui/` (Streamlit, см. ADR-003 доп. 2026-09-07).

Стек: Next.js + Tailwind (паттерн gar-admin-ui, независимый репозиторий).

См. `ds_search/docs/adr/ADR-004-produkt-1-sayt.md`.

## Запуск (dev)
```bash
cd /home/vector/projects/ds/ds_site && npm run dev -- -p 3001
```
Сайт: http://localhost:3001/ (требует запущенный gar-core-api, обычно порт 8100).
