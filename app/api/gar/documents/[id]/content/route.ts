// app/api/gar/documents/[id]/content/route.ts
// Proxy к GAR /public/documents/{id}/content (issue ds_search#138, ADR-0006).
// 404, если canonical_md не скачан по лицензии.

import { NextResponse } from "next/server";
import { garDocumentContent } from "@/lib/gar";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const res = await garDocumentContent(id);
    if (!res.ok) {
      return NextResponse.json({ error: "not available" }, { status: res.status });
    }
    const text = await res.text();
    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GAR request failed" },
      { status: 502 },
    );
  }
}
