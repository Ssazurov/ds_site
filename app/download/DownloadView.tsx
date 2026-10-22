"use client";
// Данные релизов — рантайм-JSON (ds_site#230): страница-оболочка, релиз виден без пересборки сайта.
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Release = {
  version: string;
  date: string;
  notes: string;
  apk_url?: string;
  size_mb?: number;
  sha256?: string;
  build?: number;
};

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
// Pages: статический /releases.json; внутренний режим: Route Handler.
const SRC = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1" ? `${BASE}/data/releases.json` : "/api/releases";

function sortReleases(r: Release[]) {
  return [...r].sort((a, b) => b.date.localeCompare(a.date) || b.version.localeCompare(a.version, undefined, { numeric: true }));
}

export default function DownloadView({ initial }: { initial?: Release[] }) {
  const [list, setList] = useState<Release[] | null>(initial ? sortReleases(initial) : null);
  const [err, setErr] = useState(false);
  const [ver, setVer] = useState<string | null>(null);

  useEffect(() => {
    setVer(new URLSearchParams(window.location.search).get("v"));
    fetch(`${SRC}?v=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => setList(sortReleases(j.releases ?? [])))
      .catch(() => setErr(true));
  }, []);

  if (!list) {
    return (
      <p>
        {err ? "Не удалось загрузить список релизов. " : "Загрузка… "}
        <a href="https://github.com/Ssazurov/ds_app/releases">Все релизы</a>
      </p>
    );
  }
  const sel = ver ? list.find((r) => r.version === ver) : undefined;
  const cur = sel ?? list[0];
  const old = list.filter((r) => r !== cur);
  if (!cur) return <p>Релизов пока нет.</p>;
  return (
    <>
      <section className="chat-panel about-text" aria-label="Версия">
        {ver && !sel && <p>Версия {ver} не найдена, показана актуальная.</p>}
        <h2>Версия {cur.version}{cur.build ? ` (${cur.build})` : ""}</h2>
        <p>
          {cur.date}
          {cur.size_mb ? ` · ${cur.size_mb} МБ` : ""} · Android (APK)
        </p>
        {cur.apk_url ? (
          <p><a className="dl-btn" href={cur.apk_url}>Скачать APK</a></p>
        ) : (
          <p>APK для этой версии пока не загружен.</p>
        )}
        {cur.sha256 && <p><small>SHA-256: <code>{cur.sha256}</code></small></p>}
        <h3>Что изменилось</h3>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{cur.notes}</ReactMarkdown>
      </section>
      {old.length > 0 && (
        <section className="chat-panel about-text" aria-label="Другие версии">
          <h2>Другие версии</h2>
          <ul>
            {old.map((r) => (
              <li key={r.version}>
                <a href={`${BASE}/download/?v=${r.version}`}>Версия {r.version}</a> — {r.date}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
