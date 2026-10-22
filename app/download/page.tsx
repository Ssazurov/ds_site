// app/download/page.tsx
import { listReleases } from "@/lib/releases";
import DownloadView from "./DownloadView";

export const metadata = { title: "Скачать" };

export default function DownloadPage() {
  // initial — снимок на момент сборки (для SEO/без JS); клиент подтягивает актуальный releases.json
  const initial = listReleases();
  return (
    <main className="chat-shell">
      <header className="chat-header about-header">
        <h1>Скачать</h1>
      </header>
      <DownloadView initial={initial} />
      <noscript>
        <p>Включите JavaScript или откройте <a href="https://github.com/Ssazurov/ds_app/releases">релизы на GitHub</a>.</p>
      </noscript>
    </main>
  );
}
