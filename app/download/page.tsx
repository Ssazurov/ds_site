// app/download/page.tsx
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { listReleases } from "@/lib/releases";

export const metadata = { title: "Скачать" };

export default function DownloadPage() {
  const [cur, ...old] = listReleases();
  return (
    <main className="chat-shell">
      <header className="chat-header about-header">
        <h1>Скачать</h1>
      </header>
      <section className="chat-panel about-text" aria-label="Актуальная версия">
        {cur ? (
          <>
            <h2>Версия {cur.version}{cur.build ? ` (${cur.build})` : ""}</h2>
            <p>
              {cur.date}
              {cur.size_mb ? ` · ${cur.size_mb} МБ` : ""} · Android (APK)
            </p>
            {cur.apk_url ? (
              <p>
                <a className="dl-btn" href={cur.apk_url}>Скачать APK</a>
              </p>
            ) : (
              <p>APK для этой версии пока не загружен.</p>
            )}
            {cur.sha256 && <p><small>SHA-256: <code>{cur.sha256}</code></small></p>}
            <h3>Что изменилось</h3>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{cur.notes}</ReactMarkdown>
          </>
        ) : (
          <p>Релизов пока нет.</p>
        )}
      </section>
      {old.length > 0 && (
        <section className="chat-panel about-text" aria-label="Предыдущие версии">
          <h2>Предыдущие версии</h2>
          <ul>
            {old.map((r) => (
              <li key={r.version}>
                <Link href={`/download/${r.version}`}>Версия {r.version}</Link> — {r.date}
              </li>
            ))}
          </ul>
          <p><small>Для предыдущих версий приводится только описание изменений.</small></p>
        </section>
      )}
    </main>
  );
}
