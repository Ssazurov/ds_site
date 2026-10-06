// app/articles/[id]/page.tsx
// Просмотр статьи (issue ds_search#138, ADR-0006):
// - assets.canonical_md.available=true -> полный текст + автор + ссылка на источник
// - иначе -> карточка метаданных + ссылка на источник, без текста
// Для digest (ds_site#127, ADR-0024): блок "Оригинал статьи" перед текстом.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getDocumentContent, getDocumentDetail, IS_STATIC } from "@/lib/gar/data";
import type { DocumentDetail } from "@/lib/gar";
import FavoriteButton from "@/components/FavoriteButton";
import AuthorLink, { SourceLink, stripAuthorLine, stripLeadingTitle } from "@/components/AuthorLink";
import { formatDate, readingMinutes, metaReadingMinutes, readingLabel } from "@/lib/format";
import { useMetadataLabels } from "@/lib/gar/labels";

const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";

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
  const { ruLabel } = useMetadataLabels(DATASET_ID);

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
        {doc && <h1>{articleTitle(doc)} <FavoriteButton id={id} title={articleTitle(doc)} /></h1>}
      </header>

      <section className="chat-panel" aria-label="Материал">
        {loading && <p className="message">Загружаю...</p>}
        {error && <p className="message error" role="alert">{error}</p>}

        {doc && !loading && !error && (
          <>
            {(() => {
              const dirValue = typeof doc.metadata?.direction === "string" ? doc.metadata.direction : null;
              const catValue = typeof doc.metadata?.category === "string" ? doc.metadata.category : null;
              if (!dirValue && !catValue) return null;
              return (
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                  {dirValue && (
                    <Link className="tag" href={`/articles?direction=${dirValue}`}>
                      {ruLabel("direction", dirValue) ?? dirValue}
                    </Link>
                  )}
                  {catValue && (
                    <Link className="tag" href={`/articles?direction=${dirValue || ""}&category=${catValue}`}>
                      {ruLabel("category", catValue) ?? catValue}
                    </Link>
                  )}
                </div>
              );
            })()}
            <p className="fb-total">
              {[formatDate(doc.metadata?.publish_date), (content ? readingMinutes(content) : metaReadingMinutes(doc.metadata)) ? readingLabel((content ? readingMinutes(content) : metaReadingMinutes(doc.metadata))!) : null].filter(Boolean).join(" · ")}
            </p>

            {doc.metadata?.doc_type === "digest" && sourceUrl(doc) && (
              <div className="digest-source-block">
                <p className="digest-label">Пересказ</p>
                <p className="digest-note">
                  Оригинал статьи: <a href={sourceUrl(doc)!} target="_blank" rel="noopener nofollow">{sourceUrl(doc)!}</a>
                </p>
              </div>
            )}

            {(author(doc) || sourceUrl(doc)) && doc.metadata?.doc_type !== "digest" && (
              <p className="lede">
                {author(doc) && <>Автор: <AuthorLink value={author(doc)!} />. </>}
                {sourceUrl(doc) && (
                  <>Источник: <SourceLink url={sourceUrl(doc)!} title={articleTitle(doc)} short /></>
                )}
              </p>
            )}

            {content ? (
              <div className="reading">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{stripLeadingTitle(stripAuthorLine(content), articleTitle(doc))}</ReactMarkdown>
              </div>
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
