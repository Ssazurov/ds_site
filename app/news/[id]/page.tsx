// app/news/[id]/page.tsx — серверная обёртка: generateStaticParams для внешней
// статической сборки (ds_site#93, ADR-0018); сам экран — клиентский NewsView.
import NewsView from "./NewsView";
import { staticIds } from "@/lib/static-ids";

export async function generateStaticParams() {
  return staticIds("news");
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NewsView id={id} />;
}
