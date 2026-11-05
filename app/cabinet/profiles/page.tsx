"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/cabinet-auth";

type Profile = { id: string; code: string; full_name: string };

export default function ProfilesPage() {
  const [items, setItems] = useState<Profile[]>([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    apiFetch("/profiles")
      .then(async (r) => r.ok && setItems(await r.json()))
      .catch(() => setMsg("Не удалось загрузить"));
  }, [tick]);

  async function create() {
    const r = await apiFetch("/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name }),
    });
    if (r.ok) {
      setName("");
      setMsg("");
      setTick((t) => t + 1);
    } else setMsg("Не удалось создать профиль");
  }

  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">Профили и коды</h1>
      <div className="mb-6 flex gap-2">
        <input className="flex-1 rounded border px-3 py-2" placeholder="Имя подопечного" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="rounded border px-3 py-2" onClick={create}>
          Выдать код
        </button>
      </div>
      {msg && <p role="alert">{msg}</p>}
      <ul className="flex flex-col gap-2">
        {items.map((p) => (
          <li key={p.id} className="flex justify-between rounded border px-3 py-2">
            <span>{p.full_name || "Без имени"}</span>
            <span className="font-mono">{p.code}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
