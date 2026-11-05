"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/cabinet-auth";

type User = { id: string; login: string; full_name: string };
type Profile = { id: string; code: string; full_name: string };
type Link = { id: string; specialist_id: string; profile_id: string; revoked_at: string | null };

export default function LinksPage() {
  const [specs, setSpecs] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [sid, setSid] = useState("");
  const [pid, setPid] = useState("");
  const [msg, setMsg] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    Promise.all([apiFetch("/users?role=specialist"), apiFetch("/profiles"), apiFetch("/links")])
      .then(async ([u, p, l]) => {
        if (u.ok) setSpecs(await u.json());
        if (p.ok) setProfiles(await p.json());
        if (l.ok) setLinks(await l.json());
      })
      .catch(() => setMsg("Не удалось загрузить"));
  }, [tick]);

  async function add() {
    const r = await apiFetch("/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ specialist_id: sid, profile_id: pid }),
    });
    setMsg(r.ok ? "" : r.status === 409 ? "Связь уже есть" : "Не удалось создать связь");
    setTick((t) => t + 1);
  }

  async function revoke(id: string) {
    await apiFetch(`/links/${id}/revoke`, { method: "POST" });
    setTick((t) => t + 1);
  }

  const sname = (id: string) => specs.find((s) => s.id === id)?.full_name || specs.find((s) => s.id === id)?.login || id;
  const pname = (id: string) => profiles.find((p) => p.id === id)?.full_name || profiles.find((p) => p.id === id)?.code || id;

  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">Связи специалист ↔ подопечный</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        <select className="rounded border px-3 py-2" value={sid} onChange={(e) => setSid(e.target.value)} aria-label="Специалист">
          <option value="">Специалист…</option>
          {specs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name || s.login}
            </option>
          ))}
        </select>
        <select className="rounded border px-3 py-2" value={pid} onChange={(e) => setPid(e.target.value)} aria-label="Подопечный">
          <option value="">Подопечный…</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name || p.code}
            </option>
          ))}
        </select>
        <button className="rounded border px-3 py-2" onClick={add} disabled={!sid || !pid}>
          Связать
        </button>
      </div>
      {msg && <p role="alert">{msg}</p>}
      <ul className="flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.id} className={`flex justify-between rounded border px-3 py-2 ${l.revoked_at ? "opacity-50" : ""}`}>
            <span>
              {sname(l.specialist_id)} → {pname(l.profile_id)}
              {l.revoked_at && " (отозвана)"}
            </span>
            {!l.revoked_at && (
              <button className="text-sm underline" onClick={() => revoke(l.id)}>
                Отозвать
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
