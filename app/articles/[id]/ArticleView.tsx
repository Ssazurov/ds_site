// app/articles/[id]/page.tsx
// Просмотр статьи (issue ds_search#138, ADR-0006):
// - assets.canonical_md.available=true -> полный текст + автор + ссылка на источник
// - иначе -> карточка метаданных + ссылка на источник, без текста

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDocumentContent, getDocumentDetail, IS_STATIC } from "@/lib/gar/data";
import type { DocumentDetail } from "@/lib/gar";
import { formatDate, readingMinutes, metaReadingMinutes, readingLabel } from "@/lib/format";

function articleTitle(doc: DocumentDetail) {
  return String(doc.metadata?.title || doc.doc_name);
}

function sourceUrl(doc: DocumentDetail) {
  const url = doc.metadata?.source_url || doc.metadata?.original_url || doc.metadata?.canonical_md_url;
  return typeof url === "string" ? url : null;
}

function author(doc: DocumentDetail) {
  const a = doc.metadata?.author;
  return typeof a === "string" && a ? a : null;
}

export default function ArticlePage({ id }: { id: string }) {
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getDocumentDetail(id);
        if (cancelled) return;
        setDoc(data);
        if (data.assets?.canonical_md?.available) {
          const text = await getDocumentContent(id);
          if (!cancelled && text !== null) setContent(text);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить статью.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id]);

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <p className="eyebrow"><Link href="/articles">← Статьи</Link></p>
        {doc && <h1>{articleTitle(doc)}</h1>}
      </header>

      <section className="chat-panel" aria-label="Материал">
        {loading && <p className="message">Загружаю...</p>}
        {error && <p className="message error" role="alert">{error}</p>}

        {doc && !loading && !error && (
          <>
            <p className="fb-total">
              {[formatDate(doc.metadata?.publish_date), (content ? readingMinutes(content) : metaReadingMinutes(doc.metadata)) ? readingLabel((content ? readingMinutes(content) : metaReadingMinutes(doc.metadata))!) : null].filter(Boolean).join(" · ")}
            </p>
            {(author(doc) || sourceUrl(doc)) && (
              <p className="lede">
                {author(doc) && <>Автор: {author(doc)}. </>}
                {sourceUrl(doc) && (
                  <a href={sourceUrl(doc)!} target="_blank" rel="noreferrer">
                    Источник <span aria-hidden="true">↗</span>
                  </a>
                )}
              </p>
            )}

            {content ? (
              <div className="reading">{content}</div>
            ) : (
              <>
                {IS_STATIC && typeof doc.metadata?.description === "string" && doc.metadata.description && (
                  <p className="card-desc">{doc.metadata.description}</p>
                )}
                <p className="message">
                Полный текст материала недоступен на сайте (ограничение лицензии источника).
                Перейдите по ссылке на источник, чтобы прочитать его полностью.
              </p>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
