"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/cabinet-auth";
import { useClients, useGames } from "@/lib/cabinet-clients";

type Assignment = { id: string; game: string; start_date: string; end_date: string; target: number; done: number; status: string };
const PRESETS: [string, string][] = [
  ["day1", "1 день"],
  ["day3", "3 дня"],
  ["week1", "Неделя"],
  ["week2", "2 недели"],
];
const STATUS: Record<string, string> = {
  planned: "запланировано",
  active: "идёт",
  completed: "выполнено",
  expired: "срок истёк",
  cancelled: "отменено",
};

function AssignmentsView() {
  const id = useSearchParams().get("id") ?? "";
  const clients = useClients();
  const games = useGames();
  const client = clients?.find((c) => c.profile_id === id);
  const [items, setItems] = useState<Assignment[]>([]);
  const [game, setGame] = useState("");
  const [preset, setPreset] = useState("week1");
  const [target, setTarget] = useState(5);
  const [msg, setMsg] = useState("");
  const slug = game || games[0]?.slug || "";

  const load = useCallback(async () => {
    if (!client) return;
    const r = await apiFetch(`/assignments/${client.link_id}`);
    if (r.ok) setItems(await r.json());
  }, [client]);
  useEffect(() => {
    if (!client) return;
    apiFetch(`/assignments/${client.link_id}`)
      .then(async (r) => {
        if (r.ok) setItems(await r.json());
      })
      .catch(() => setMsg("Не удалось загрузить задания"));
  }, [client]);

  async function add() {
    if (!client || !slug) return;
    const r = await apiFetch(`/assignments/${client.link_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: slug, target, preset }),
    });
    setMsg(r.ok ? "" : "Не удалось создать задание");
    if (r.ok) await load();
  }

  async function cancel(aid: string) {
    if (!client) return;
    const r = await apiFetch(`/assignments/${client.link_id}/${aid}`, { method: "DELETE" });
    if (r.ok) await load();
  }

  if (!id) return <p>Не указан подопечный</p>;
  return (
    <main>
      <p className="mb-3">
        <Link href={`/cabinet/client/?id=${id}`}>← Профиль</Link>
      </p>
      <h1 className="mb-4 text-2xl font-semibold">Задания: {client?.full_name || client?.code || ""}</h1>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          Игра
          <select className="rounded border px-3 py-2" value={slug} onChange={(e) => setGame(e.target.value)}>
            {games.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Период
          <select className="rounded border px-3 py-2" value={preset} onChange={(e) => setPreset(e.target.value)}>
            {PRESETS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Сколько раз
          <input
            className="w-24 rounded border px-3 py-2"
            type="number"
            min={1}
            max={1000}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value) || 1)}
          />
        </label>
        <button className="rounded border px-3 py-2" onClick={add}>
          Назначить
        </button>
      </div>
      {msg && <p role="alert">{msg}</p>}
      <ul className="flex flex-col gap-2">
        {items.map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded border px-3 py-2">
            <span>
              {games.find((g) => g.slug === a.game)?.title ?? a.game}: {a.done}/{a.target}, {a.start_date} — {a.end_date} (
              {STATUS[a.status] ?? a.status})
            </span>
            {a.status !== "cancelled" && (
              <button className="text-sm underline" onClick={() => cancel(a.id)}>
                Отменить
              </button>
            )}
          </li>
        ))}
        {!items.length && <li>Заданий пока нет</li>}
      </ul>
    </main>
  );
}

export default function AssignmentsPage() {
  return (
    <Suspense fallback={<p>Загрузка…</p>}>
      <AssignmentsView />
    </Suspense>
  );
}
