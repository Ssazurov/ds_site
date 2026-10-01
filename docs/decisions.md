# Архитектурные решения ds_site

Этот файл индексирует ADR (Architecture Decision Records) проекта.

## ADR-0025: Пагинация «Показать ещё» для списков документов
**Дата**: 2026-09-30  
**Статус**: Принято  
**Файл**: [adr/0025-pagination-load-more.md](adr/0025-pagination-load-more.md)

Накопительная пагинация для `/articles`, `/news`, `/links`: порции по 20 документов, серверный рендер с `?page=N`, общий хук `lib/use-document-feed.ts`.

## ADR-0026: Серверный поиск по названию через GAR
**Дата**: 2026-10-01  
**Статус**: Принято  
**Файл**: [adr/0026-server-side-title-search.md](adr/0026-server-side-title-search.md)

Поиск `?q=` передаётся в GAR `/public/documents` для полнотекстового поиска по всему корпусу с корректными facets/total.
