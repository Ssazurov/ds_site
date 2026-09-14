"use client";

import { FormEvent, useState } from "react";
import type { ChatScope, ChatSource as Source, ChatResponse } from "@/lib/gar";

// Issue #6: scope из группового выбора статей на /articles, см. filters.document_ids
// и scope_source в gar-core-api/schemas/chat.py (ADR-042: manual vs dialog).
const SCOPE_STORAGE_KEY = "ds-chat-scope";

type ChatAction = "more_sources" | "web_search" | "simplify";
type ResponseMode = "full" | "summary";

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
  const [responseMode, setResponseMode] = useState<ResponseMode>("full");
  const [sourcesVisible, setSourcesVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<ChatScope | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(SCOPE_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ChatScope) : null;
    } catch {
      // повреждённое значение в sessionStorage — игнорируем, scope просто не применится
      return null;
    }
  });

  function clearScope() {
    sessionStorage.removeItem(SCOPE_STORAGE_KEY);
    setScope(null);
  }

  async function requestAnswer(action?: ChatAction, mode = responseMode) {
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
        body: JSON.stringify({
          dataset_id: DATASET_ID,
          query: trimmedQuery,
          response_mode: mode,
          ...(action ? { action } : {}),
          ...(action === "more_sources" ? {
            exclude_ids: response?.sources?.map((source) => source.document_key).filter(Boolean),
          } : {}),
          ...(scope?.document_ids.length ? {
            filters: { document_ids: scope.document_ids },
            scope_source: "manual",
          } : {}),
        }),
      });
      const data = (await result.json()) as ChatResponse;
      if (!result.ok) throw new Error(data.error || "Не удалось получить ответ.");
      setResponse(data);
      setSourcesVisible(false);
    } catch (requestError) {
      setResponse(null);
      setError(requestError instanceof Error ? requestError.message : "Не удалось получить ответ.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void requestAnswer();
  }

  function changeResponseMode(mode: ResponseMode) {
    setResponseMode(mode);
    if (response) void requestAnswer(undefined, mode);
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
          <fieldset className="response-mode" disabled={loading}>
            <legend>Формат ответа</legend>
            <button
              type="button"
              className={responseMode === "full" ? "selected" : ""}
              aria-pressed={responseMode === "full"}
              onClick={() => changeResponseMode("full")}
            >
              Подробно
            </button>
            <button
              type="button"
              className={responseMode === "summary" ? "selected" : ""}
              aria-pressed={responseMode === "summary"}
              onClick={() => changeResponseMode("summary")}
            >
              Кратко
            </button>
          </fieldset>
        </form>

        {scope && scope.document_ids.length > 0 && (
          <div className="scope-badge" role="status">
            <span>Ограничено выбранными статьями ({scope.document_ids.length}): {scope.titles.join(", ")}</span>
            <button type="button" onClick={clearScope}>Сбросить</button>
          </div>
        )}

        {error && <p className="message error" role="alert">{error}</p>}
        {response?.answer && (
          <article className="answer-block">
            <p className="section-label">Ответ</p>
            <div className="answer-text">{response.answer}</div>
            <div className="chat-actions" aria-label="Действия с ответом">
              {response.sources && response.sources.length > 0 && (
                <button type="button" onClick={() => setSourcesVisible((visible) => !visible)}>
                  {sourcesVisible ? "Скрыть источники" : "Показать источники"}
                </button>
              )}
              <button type="button" onClick={() => void requestAnswer("more_sources")} disabled={loading}>
                Ещё источники
              </button>
              <button type="button" onClick={() => void requestAnswer("web_search")} disabled={loading}>
                Искать в интернете
              </button>
              <button type="button" onClick={() => void requestAnswer("simplify")} disabled={loading}>
                Объясни проще
              </button>
            </div>
          </article>
        )}

        {sourcesVisible && response?.sources && response.sources.length > 0 && (
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
