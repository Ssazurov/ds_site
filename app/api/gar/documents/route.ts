// app/api/gar/documents/route.ts
// Proxy к GAR /public/documents (issue ds_site#4, ADR-0003: страница "Статьи").

import { NextRequest, NextResponse } from "next/server";
import { garDocuments } from "@/lib/gar";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  try {
    const res = await garDocuments(params);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GAR request failed" },
      { status: 502 },
    );
  }
}
