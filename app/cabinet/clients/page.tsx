"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/cabinet-auth";

type Client = { link_id: string; profile_id: string; code: string; full_name: string };

export default function ClientsPage() {
  const [items, setItems] = useState<Client[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    apiFetch("/links/mine")
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        setItems(await r.json());
      })
      .catch(() => setError("Не удалось загрузить список"));
  }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (items ?? []).filter((c) => !s || c.full_name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s));
  }, [items, q]);

  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">Подопечные</h1>
      <label className="mb-4 block">
        <span className="sr-only">Поиск по имени или коду</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по имени или коду"
          className="w-full rounded border px-3 py-2"
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {!items && !error && <p>Загрузка…</p>}
      {items && shown.length === 0 && <p>{items.length ? "Ничего не найдено" : "Подопечных пока нет"}</p>}
      <ul className="flex flex-col gap-2">
        {shown.map((c) => (
          <li key={c.link_id}>
            <Link className="flex justify-between rounded border px-3 py-2" href={`/cabinet/client/?id=${c.profile_id}`}>
              <span>{c.full_name || "Без имени"}</span>
              <span className="font-mono opacity-70">{c.code}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
