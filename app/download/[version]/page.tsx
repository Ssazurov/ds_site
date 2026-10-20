// app/download/[version]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getRelease, listReleases } from "@/lib/releases";

export const dynamicParams = false;

export function generateStaticParams() {
  return listReleases().map((r) => ({ version: r.version }));
}

export default async function ReleasePage({ params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  const r = getRelease(version);
  if (!r) notFound();
  return (
    <main className="chat-shell">
      <section className="chat-panel about-text" aria-label={`Версия ${r.version}`}>
        <p><Link href="/download">← Скачать</Link></p>
        <h1>Версия {r.version}</h1>
        <p>{r.date}</p>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{r.notes}</ReactMarkdown>
      </section>
    </main>
  );
}
