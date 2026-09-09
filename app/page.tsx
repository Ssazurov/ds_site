"use client";

import { FormEvent, useState } from "react";

type Source = {
  text?: string;
  document_key?: string;
  document_name?: string | null;
  original_url?: string | null;
  canonical_md_url?: string | null;
  metadata?: Record<string, unknown>;
};

type ChatResponse = {
  answer?: string;
  sources?: Source[];
  error?: string;
};

const DATASET_ID = process.env.NEXT_PUBLIC_GAR_DATASET_ID ?? "";

function sourceTitle(source: Source) {
  return source.document_name || String(source.metadata?.title || "Источник");
}

function sourceSummary(source: Source) {
  const text = source.text?.replace(/\s+/g, " ").trim() || "Аннотация источника недоступна.";
  return text.length > 240 ? `${text.slice(0, 237).trimEnd()}...` : text;
}

function sourceUrl(source: Source) {
  return source.original_url || source.canonical_md_url || null;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !DATASET_ID) {
      setError(DATASET_ID ? "Введите вопрос." : "Не настроен идентификатор набора данных.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetch("/api/gar/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset_id: DATASET_ID, query: trimmedQuery }),
      });
      const data = (await result.json()) as ChatResponse;
      if (!result.ok) throw new Error(data.error || "Не удалось получить ответ.");
      setResponse(data);
    } catch (requestError) {
      setResponse(null);
      setError(requestError instanceof Error ? requestError.message : "Не удалось получить ответ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <p className="eyebrow">GAR / public knowledge base</p>
        <h1>Поиск по базе знаний</h1>
        <p className="lede">Ответы собраны по проверенным материалам и сопровождаются ссылками на источники.</p>
      </header>

      <section className="chat-panel" aria-label="Чат с базой знаний">
        <form className="query-form" onSubmit={submit}>
          <label htmlFor="query">Ваш вопрос</label>
          <div className="query-row">
            <textarea
              id="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Например: какие признаки требуют консультации специалиста?"
              rows={3}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !query.trim()}>
              {loading ? "Ищу..." : "Спросить"}
            </button>
          </div>
        </form>

        {error && <p className="message error" role="alert">{error}</p>}
        {response?.answer && (
          <article className="answer-block">
            <p className="section-label">Ответ</p>
            <div className="answer-text">{response.answer}</div>
          </article>
        )}

        {response?.sources && response.sources.length > 0 && (
          <section className="sources-block" aria-label="Источники ответа">
            <div className="sources-heading">
              <p className="section-label">Источники</p>
              <span>{response.sources.length}</span>
            </div>
            <div className="source-grid">
              {response.sources.map((source, index) => {
                const url = sourceUrl(source);
                return (
                  <article className="source-card" key={`${source.document_key || "source"}-${index}`}>
                    <p className="source-index">Источник {index + 1}</p>
                    <h2>{sourceTitle(source)}</h2>
                    <p>{sourceSummary(source)}</p>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer">
                        Открыть источник <span aria-hidden="true">↗</span>
                      </a>
                    ) : <span className="no-link">Ссылка недоступна</span>}
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </section>
      </main>
  );
}
