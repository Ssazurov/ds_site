// app/articles/[id]/page.tsx — серверная обёртка: generateStaticParams для внешней
// статической сборки (ds_site#93, ADR-0018); сам экран — клиентский ArticleView.
import ArticleView from "./ArticleView";
import { staticIds } from "@/lib/static-ids";

export async function generateStaticParams() {
  return staticIds("articles");
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ArticleView id={id} />;
}
