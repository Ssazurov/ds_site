// app/docs/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getDoc, listDocs } from "@/lib/reestr-docs";

export const dynamicParams = false;

export function generateStaticParams() {
  return listDocs().map((d) => ({ slug: d.slug }));
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();
  return (
    <main className="chat-shell">
      <section className="chat-panel about-text" aria-label={doc.title}>
        <p><Link href="/docs">← Документация</Link></p>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) =>
              href && /^[\w-]+\.md$/.test(href) ? (
                <Link href={`/docs/${href.replace(/\.md$/, "")}`}>{children}</Link>
              ) : (
                <a href={href}>{children}</a>
              ),
          }}
        >
          {doc.body}
        </ReactMarkdown>
      </section>
    </main>
  );
}
