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

export type FilterKey = "direction" | "category" | "doc_type" | "age" | "target_audience";
