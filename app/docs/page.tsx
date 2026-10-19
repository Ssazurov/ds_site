// app/docs/page.tsx
import Link from "next/link";
import { listDocs } from "@/lib/reestr-docs";

export const metadata = { title: "Документация" };

export default function DocsPage() {
  const docs = listDocs();
  return (
    <main className="chat-shell">
      <header className="chat-header about-header">
        <h1>Документация</h1>
      </header>
      <section className="chat-panel about-text" aria-label="Документация">
        <ul>
          {docs.map((d) => (
            <li key={d.slug}>
              <Link href={`/docs/${d.slug}`}>{d.title}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
