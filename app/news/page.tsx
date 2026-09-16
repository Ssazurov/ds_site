// app/news/page.tsx
// Раздел "Новости": лента опубликованных новостей (doc_type=news, см.
// ds_search/src/news/publish.py). Публикация уже уходит в GAR — отдельного
// хранилища на сайте нет, читаем через тот же /public/documents, что и
// "Статьи" (ADR-0003), с фиксированным doc_type=news и сортировкой по дате
// публикации (сортировка на клиенте — public_documents сорт по дате не
// поддерживает).

"use client";

import { useEffect, useState } from "react";
import type { DocumentSummary, DocumentsResponse } from "@/lib/gar";

const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";

function newsTitle(doc: DocumentSummary) {
  return String(doc.metadata?.title || doc.doc_name);
}

function newsDate(doc: DocumentSummary): string | null {
  const raw = doc.metadata?.publish_date;
  if (typeof raw !== "string") return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

function newsSummary(doc: DocumentSummary): string | null {
  const s = doc.metadata?.description;
  return typeof s === "string" && s.trim() ? s : null;
}

function newsUrl(doc: DocumentSummary): string | null {
  const url = doc.metadata?.source_url;
  return typeof url === "string" ? url : null;
}

export default function NewsPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!DATASET_ID) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          dataset_id: DATASET_ID,
          doc_type: "news",
          per_page: "50",
        });
        const res = await fetch(`/api/gar/documents?${params.toString()}`);
        const data = (await res.json()) as DocumentsResponse;
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        const docs = [...(data.documents || [])].sort((a, b) => {
          const da = String(a.metadata?.publish_date || "");
          const dbv = String(b.metadata?.publish_date || "");
          return dbv.localeCompare(da);
        });
        setDocuments(docs);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить новости.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <p className="eyebrow">Библиотека</p>
        <h1>Новости</h1>
        <p className="lede">Новости по теме синдрома Дауна со ссылками на источник.</p>
      </header>

      <section className="chat-panel" aria-label="Список новостей">
        {!DATASET_ID && <p className="message error" role="alert">Не настроен идентификатор набора данных.</p>}
        {error && <p className="message error" role="alert">{error}</p>}
        {loading && <p className="message">Загружаю...</p>}

        {!loading && !error && documents.length === 0 && (
          <p className="message">Пока нет опубликованных новостей.</p>
        )}

        {!loading && documents.length > 0 && (
          <div className="source-grid">
            {documents.map((doc) => {
              const url = newsUrl(doc);
              const date = newsDate(doc);
              const summary = newsSummary(doc);
              return (
                <article className="source-card" key={doc.document_id}>
                  <h2>{newsTitle(doc)}</h2>
                  {date && <p className="eyebrow">{date}</p>}
                  {summary && <p>{summary}</p>}
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer" className="source-link">
                      Источник <span aria-hidden="true">↗</span>
                    </a>
                  ) : <span className="no-link">Ссылка недоступна</span>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
