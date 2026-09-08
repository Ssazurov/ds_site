// app/api/gar/scope-tree/route.ts
// Proxy к GAR /public/documents/scope-tree. См. lib/gar.ts про план на будущее.

import { NextRequest, NextResponse } from "next/server";
import { garScopeTree } from "@/lib/gar";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  try {
    const res = await garScopeTree(params);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GAR request failed" },
      { status: 502 },
    );
  }
}
