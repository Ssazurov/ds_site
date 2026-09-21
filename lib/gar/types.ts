// lib/gar/types.ts
//
// Переиспользуемый контракт ответов GAR /public/* (ADR-0003 п.2, issue #7).
// Раньше типы были продублированы в app/articles/page.tsx, app/links/page.tsx,
// app/articles/[id]/page.tsx, app/page.tsx — теперь один источник правды для
// сайта и будущего приложения (web/tablet/mobile).

export type DocumentSummary = {
  document_id: string;
  doc_name: string;
  metadata?: Record<string, unknown>;
};

export type DocumentsResponse = {
  documents?: DocumentSummary[];
  total?: number;
  facets?: Record<string, string[]>;
  // ADR-0020: домены источников со счётчиками (только статический режим, пока GAR не отдаёт).
  domains?: { domain: string; count: number }[];
  error?: string;
};

export type DocumentDetail = {
  document_id: string;
  doc_name: string;
  metadata?: Record<string, unknown>;
  assets?: { canonical_md?: { available?: boolean } };
  error?: string;
};

export type ChatSource = {
  text?: string;
  document_key?: string;
  document_name?: string | null;
  original_url?: string | null;
  canonical_md_url?: string | null;
  metadata?: Record<string, unknown>;
};

export type ChatResponse = {
  answer?: string;
  sources?: ChatSource[];
  error?: string;
};

export type ChatScope = { document_ids: string[]; titles: string[] };

// Контракт GAR /public/documents/scope-tree (schemas/scope.py, issue #17):
// дерево product -> doc_type -> documents, для встроенного в /assistant
// пикера статей поверх ручного выбора на /articles (issue #6).
export type ScopeDocument = {
  document_id: string;
  title: string;
  product: string;
  doc_type: string;
  summary?: string | null;
};

export type ScopeDocType = { name: string; documents: ScopeDocument[] };

export type ScopeProduct = { name: string; doc_types: ScopeDocType[] };

export type ScopeTreeResponse = {
  products?: ScopeProduct[];
  total?: number;
  offset?: number;
  limit?: number;
  error?: string;
};

export type FilterKey = "direction" | "category" | "doc_type" | "age" | "target_audience";

// Словарь метаданных GAR (issue ds_site#12): value -> русская подпись,
// по каждому полю (direction/category/...). Источник правды — GAR
// (GET /datasets/{id}/metadata-fields), не локальные константы.
export type MetadataLabels = Record<FilterKey, Record<string, string>>;
