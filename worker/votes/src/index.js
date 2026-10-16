// Worker голосов 👍/👎 для статей и новостей. D1-таблица votes (schema.sql).
// POST /vote {id, kind, vote: 1|-1|0, voter} · GET /counts?ids=a,b · GET /export?since=ts (Bearer EXPORT_TOKEN)
const ORIGINS = ["https://ssazurov.github.io", "http://localhost:3001"];
const ID_RE = /^[\w-]{1,80}$/;

function cors(req) {
  const o = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}
const json = (req, data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });

    if (url.pathname === "/vote" && req.method === "POST") {
      if (!ORIGINS.includes(req.headers.get("Origin"))) return json(req, { error: "origin" }, 403);
      let b;
      try { b = await req.json(); } catch { return json(req, { error: "json" }, 400); }
      const { id, voter, vote } = b;
      const kind = b.kind === "news" ? "news" : "article";
      if (!ID_RE.test(id || "") || !ID_RE.test(voter || "") || ![1, -1, 0].includes(vote)) return json(req, { error: "bad" }, 400);
      await env.DB.prepare(
        "INSERT INTO votes (doc_id,voter,kind,vote,ts) VALUES (?,?,?,?,?) ON CONFLICT(doc_id,voter) DO UPDATE SET vote=excluded.vote, ts=excluded.ts"
      ).bind(id, voter, kind, vote, Date.now()).run();
      return json(req, { ok: true });
    }

    if (url.pathname === "/counts") {
      const ids = (url.searchParams.get("ids") || "").split(",").filter((x) => ID_RE.test(x)).slice(0, 60);
      if (!ids.length) return json(req, {});
      const q = `SELECT doc_id, SUM(vote=1) up, SUM(vote=-1) down FROM votes WHERE doc_id IN (${ids.map(() => "?").join(",")}) GROUP BY doc_id`;
      const { results } = await env.DB.prepare(q).bind(...ids).all();
      return json(req, Object.fromEntries(results.map((r) => [r.doc_id, { up: r.up, down: r.down }])));
    }

    if (url.pathname === "/export") {
      if (req.headers.get("Authorization") !== `Bearer ${env.EXPORT_TOKEN}`) return json(req, { error: "auth" }, 401);
      const since = Number(url.searchParams.get("since") || 0);
      const { results } = await env.DB.prepare("SELECT doc_id,voter,kind,vote,ts FROM votes WHERE ts>? ORDER BY ts LIMIT 5000").bind(since).all();
      return json(req, results);
    }
    return json(req, { error: "not found" }, 404);
  },
};
