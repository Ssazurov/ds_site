// lib/gar/index.ts — единая точка входа в shared-слой контракта GAR (issue #7).
export * from "./client";
export * from "./types";
// "./labels" не реэкспортируем отсюда: это "use client" хук (React), а
// index.ts импортируется и из серверных Route Handlers — тянуть React-код
// в их бандл незачем. Импортировать из "@/lib/gar/labels" напрямую.
