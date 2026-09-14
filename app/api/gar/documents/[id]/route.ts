// app/api/gar/documents/[id]/route.ts
// Proxy к GAR /public/documents/{id} (issue ds_search#138, ADR-0006).

import { NextResponse } from "next/server";
import { garDocumentDetail } from "@/lib/gar";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const res = await garDocumentDetail(id);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GAR request failed" },
      { status: 502 },
    );
  }
}
