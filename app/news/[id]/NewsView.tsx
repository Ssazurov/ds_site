// app/news/[id]/page.tsx
// Просмотр новости (по образцу articles/[id]) (issue ds_search#138, ADR-0006):
// - assets.canonical_md.available=true -> полный текст + автор + ссылка на источник
// - иначе -> карточка метаданных + ссылка на источник, без текста

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDocumentContent, getDocumentDetail, IS_STATIC } from "@/lib/gar/data";
import type { DocumentDetail } from "@/lib/gar";
import AuthorLink, { SourceLink } from "@/components/AuthorLink";
import { useMetadataLabels } from "@/lib/gar/labels";

const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";

function newsTitle(doc: DocumentDetail) {
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

export default function NewsItemPage({ id }: { id: string }) {
  const { ruLabel } = useMetadataLabels(DATASET_ID);
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
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить новость.");
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
        <p className="eyebrow"><Link href="/news">← Новости</Link></p>
        {doc && <h1>{newsTitle(doc)}</h1>}
      </header>

      <section className="chat-panel" aria-label="Материал">
        {loading && <p className="message">Загружаю...</p>}
        {error && <p className="message error" role="alert">{error}</p>}

        {doc && !loading && !error && (
          <>
            {(doc.metadata?.direction || doc.metadata?.category) && (() => {
              const dirValue = typeof doc.metadata?.direction === "string" ? doc.metadata.direction : null;
              const catValue = typeof doc.metadata?.category === "string" ? doc.metadata.category : null;
              if (!dirValue && !catValue) return null;
              return (
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                  {dirValue && (
                    <Link className="tag" href={`/news?direction=${dirValue}`}>
                      {ruLabel("direction", dirValue) ?? dirValue}
                    </Link>
                  )}
                  {catValue && (
                    <Link className="tag" href={`/news?direction=${dirValue || ""}&category=${catValue}`}>
                      {ruLabel("category", catValue) ?? catValue}
                    </Link>
                  )}
                </div>
              );
            })()}

            {(author(doc) || sourceUrl(doc)) && (
              <p className="lede">
                {author(doc) && <>Автор: <AuthorLink value={author(doc)!} />. </>}
                {sourceUrl(doc) && (
                  <>Источник: <SourceLink url={sourceUrl(doc)!} title={newsTitle(doc)} short /></>
                )}
              </p>
            )}

            {content ? (
              <div style={{ whiteSpace: "pre-wrap" }}>{content}</div>
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
