"use client";

// components/ChatAssistant.tsx
// RAG-чат + встроенный пикер статей по scope-tree (issue #17, объединяет с
// #6 — ручной выбор статей на /articles тоже пишет в тот же sessionStorage
// ключ и подхватывается здесь). Используется на / и /assistant.

import { FormEvent, useEffect, useState } from "react";
import type {
  ChatScope,
  ChatSource as Source,
  ChatResponse,
  ScopeDocument,
  ScopeTreeResponse,
} from "@/lib/gar";

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

function readScope(): ChatScope | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SCOPE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatScope) : null;
  } catch {
    return null;
  }
}

function writeScope(scope: ChatScope | null) {
  if (scope && scope.document_ids.length) {
    sessionStorage.setItem(SCOPE_STORAGE_KEY, JSON.stringify(scope));
  } else {
    sessionStorage.removeItem(SCOPE_STORAGE_KEY);
  }
}

function ScopePicker({
  selected,
  onToggle,
}: {
  selected: Record<string, string>;
  onToggle: (doc: ScopeDocument) => void;
}) {
  const [query, setQuery] = useState("");
  const [tree, setTree] = useState<ScopeTreeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(q: string) {
    if (!DATASET_ID) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ dataset_id: DATASET_ID, limit: "50" });
      if (q.trim()) params.set("query", q.trim());
      const res = await fetch(`/api/gar/scope-tree?${params.toString()}`);
      const data = (await res.json()) as ScopeTreeResponse;
      if (data.error) throw new Error(data.error);
      setTree(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить список статей.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = setTimeout(() => void search(""), 0);
    return () => clearTimeout(id);
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search(query);
  }

  return (
    <div className="scope-picker">
      <form onSubmit={submitSearch} className="query-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск статьи по названию..."
          aria-label="Поиск статьи для чата"
        />
        <button type="submit" disabled={loading}>{loading ? "Ищу..." : "Найти"}</button>
      </form>
      {error && <p className="message error" role="alert">{error}</p>}
      {tree?.products?.length ? (
        tree.products.map((product) => (
          <details key={product.name} open={tree.products!.length === 1}>
            <summary>{product.name}</summary>
            {product.doc_types.map((docType) => (
              <details key={docType.name} style={{ marginLeft: "1rem" }}>
                <summary>{docType.name} ({docType.documents.length})</summary>
                <div className="source-grid">
                  {docType.documents.map((doc) => (
                    <label className="select-check" key={doc.document_id}>
                      <input
                        type="checkbox"
                        checked={Boolean(selected[doc.document_id])}
                        onChange={() => onToggle(doc)}
                      />
                      {doc.title}
                    </label>
                  ))}
                </div>
              </details>
            ))}
          </details>
        ))
      ) : (
        !loading && <p className="message">{DATASET_ID ? "Ничего не найдено." : "Не настроен идентификатор набора данных."}</p>
      )}
    </div>
  );
}

export default function ChatAssistant() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [responseMode, setResponseMode] = useState<ResponseMode>("full");
  const [sourcesVisible, setSourcesVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<ChatScope | null>(() => readScope());

  function clearScope() {
    writeScope(null);
    setScope(null);
  }

  function toggleScopeDoc(doc: ScopeDocument) {
    setScope((prev) => {
      const ids = new Set(prev?.document_ids || []);
      const titleById: Record<string, string> = {};
      (prev?.document_ids || []).forEach((id, i) => { titleById[id] = prev!.titles[i]; });
      if (ids.has(doc.document_id)) {
        ids.delete(doc.document_id);
        delete titleById[doc.document_id];
      } else {
        ids.add(doc.document_id);
        titleById[doc.document_id] = doc.title;
      }
      const document_ids = Array.from(ids);
      const next = document_ids.length ? { document_ids, titles: document_ids.map((id) => titleById[id]) } : null;
      writeScope(next);
      return next;
    });
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
        <h1>«Солнечный» мир</h1>
        <p className="lede">Знания о солнечных людях с синдромом Дауна</p>
      </header>

      <section className="chat-panel" aria-label="Чат с базой знаний">
        <form className="query-form" onSubmit={submit}>
          <div className="query-row">
            <textarea
              id="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ваш вопрос, например: какие признаки требуют консультации специалиста?"
              aria-label="Ваш вопрос"
              rows={3}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !query.trim()}>
              {loading ? "Ищу..." : "Спросить"}
            </button>
          </div>
          <fieldset className="response-mode" aria-label="Формат ответа" disabled={loading}>
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

        <button type="button" className="scope-toggle" aria-expanded={pickerOpen} onClick={() => setPickerOpen((v) => !v)}>
          <span aria-hidden="true">{pickerOpen ? "▾" : "▸"}</span>{" "}
          {pickerOpen ? "Скрыть выбор статей" : "Ограничить чат конкретными статьями"}
        </button>
        {pickerOpen && <ScopePicker selected={Object.fromEntries((scope?.document_ids || []).map((id) => [id, "1"]))} onToggle={toggleScopeDoc} />}

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
