// lib/votes.ts — голоса 👍/👎 через Worker ds-votes (Cloudflare). Один голос на браузер
// (voter id и свой выбор — в localStorage). Счётчики запрашиваются пачкой за тик.

const URL_ = process.env.NEXT_PUBLIC_VOTES_URL || "https://ds-votes.sazurov.workers.dev";

export type Counts = { up: number; down: number };

export function voterId(): string {
  try {
    let v = localStorage.getItem("ds-voter");
    if (!v) { v = crypto.randomUUID(); localStorage.setItem("ds-voter", v); }
    return v;
  } catch { return "anon"; }
}

export function myVote(id: string): 1 | -1 | 0 {
  try { return Number(localStorage.getItem(`ds-vote:${id}`) || 0) as 1 | -1 | 0; } catch { return 0; }
}

export function saveMyVote(id: string, v: 1 | -1 | 0) {
  try { if (v) localStorage.setItem(`ds-vote:${id}`, String(v)); else localStorage.removeItem(`ds-vote:${id}`); } catch { /* ignore */ }
}

let queue: { id: string; res: (c: Counts) => void }[] = [];
export function fetchCounts(id: string): Promise<Counts> {
  return new Promise((res) => {
    queue.push({ id, res });
    if (queue.length > 1) return;
    setTimeout(async () => {
      const batch = queue; queue = [];
      let data: Record<string, Counts> = {};
      try {
        const ids = [...new Set(batch.map((b) => b.id))].slice(0, 60).join(",");
        data = await (await fetch(`${URL_}/counts?ids=${ids}`)).json();
      } catch { /* ignore */ }
      batch.forEach((b) => b.res(data[b.id] ?? { up: 0, down: 0 }));
    }, 30);
  });
}

export async function sendVote(id: string, kind: "article" | "news", vote: 1 | -1 | 0) {
  await fetch(`${URL_}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, kind, vote, voter: voterId() }),
  });
}
