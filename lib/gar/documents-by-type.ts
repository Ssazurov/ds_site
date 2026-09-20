// Клиентский хелпер: все документы одного doc_type из GAR через
// /api/gar/documents (ADR-0016). Для небольших наборов (глоссарий, ссылки);
// per_page у GAR максимум 100 — листаем страницами.
import type { DocumentSummary } from "./types";
import { getDocuments } from "./data";

export async function fetchAllDocuments(datasetId: string, docType: string): Promise<DocumentSummary[]> {
  const out: DocumentSummary[] = [];
  for (let page = 1; page <= 50; page++) {
    const params = new URLSearchParams({
      dataset_id: datasetId, doc_type: docType, per_page: "100", page: String(page),
    });
    const data = await getDocuments(params);
    if (data.error) throw new Error(data.error);
    const docs = data.documents ?? [];
    out.push(...docs);
    if (!docs.length || out.length >= (data.total ?? 0)) break;
  }
  return out;
}

export function metaStr(doc: DocumentSummary, key: string): string | null {
  const v = doc.metadata?.[key];
  return typeof v === "string" && v ? v : null;
}
