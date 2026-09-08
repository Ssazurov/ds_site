// app/api/gar/chat/route.ts
// Proxy к GAR /public/chat. Секрет (GAR_PUBLIC_API_KEY) остаётся на сервере,
// в браузер не попадает. См. lib/gar.ts про план на будущее с Cloudflare.

import { NextRequest, NextResponse } from "next/server";
import { garChat } from "@/lib/gar";

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const res = await garChat(body);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GAR request failed" },
      { status: 502 },
    );
  }
}
