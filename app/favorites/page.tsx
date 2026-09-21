// app/favorites/page.tsx — «Избранное» (ds_site#103): статьи из localStorage, поиск по названию.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getDocumentDetail } from "@/lib/gar/data";
import type { DocumentDetail } from "@/lib/gar";
import { useFavorites } from "@/lib/favorites";
import { filterByTitle, sortNewestFirst } from "@/lib/favorites-core.mjs";
import FavoriteButton from "@/components/FavoriteButton";

function titleOf(doc: DocumentDetail) {
  return String(doc.metadata?.title || doc.doc_name);
}

export default function FavoritesPage() {
  const favs = useFavorites();
  const [docs, setDocs] = useState<Record<string, DocumentDetail | null>>({});
  const [q, setQ] = useState("");

  const ids = useMemo(() => sortNewestFirst(favs).map((e) => e.id), [favs]);

  useEffect(() => {
    const missing = ids.filter((id) => !(id in docs));
    if (!missing.length) return;
    let cancelled = false;
    Promise.all(
      missing.map((id) => getDocumentDetail(id).then((d) => [id, d] as const, () => [id, null] as const)),
    ).then((pairs) => {
      if (!cancelled) setDocs((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const items = ids.map((id) => ({ id, doc: docs[id] }));
  const loaded = items.filter((it) => it.doc !== undefined);
  const shown = filterByTitle(loaded, q, (it) => (it.doc ? titleOf(it.doc) : it.id));

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <h1>Избранное</h1>
      </header>
      <section className="chat-panel" aria-label="Избранные статьи">
        <p className="fb-total">Список хранится в этом браузере и не переносится на другие устройства.</p>
        {ids.length > 0 && (
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по названию"
            aria-label="Поиск по избранному"
          />
        )}
        {ids.length === 0 && (
          <p className="message">
            Пока пусто. Нажмите ☆ у статьи в разделе <Link href="/articles">«Статьи»</Link>.
          </p>
        )}
        {ids.length > 0 && loaded.length < ids.length && <p className="message">Загружаю...</p>}
        {ids.length > 0 && loaded.length === ids.length && shown.length === 0 && (
          <p className="message">Ничего не найдено.</p>
        )}
        <div className="source-grid">
          {shown.map(({ id, doc }) => (
            <article className="source-card" key={id}>
              <div className="card-head">
                <span />
                <FavoriteButton id={id} title={doc ? titleOf(doc) : id} />
              </div>
              <h2>
                {doc ? <Link href={`/articles/${id}`}>{titleOf(doc)}</Link> : "Статья недоступна"}
              </h2>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
