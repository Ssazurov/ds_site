"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/cabinet-auth";
import { useClients, useGames } from "@/lib/cabinet-clients";

type Row = { id: string; profile_name: string; game: string; played_at: string; result: Record<string, unknown> };
type Sum = { profile_id: string; profile_name: string; game: string; count: number; avg: Record<string, number> };
const PERIODS: [string, string][] = [
  ["", "Всё время"],
  ["today", "Сегодня"],
  ["week", "Неделя"],
  ["month", "Месяц"],
];

function ReportsView() {
  const preId = useSearchParams().get("id");
  const clients = useClients();
  const games = useGames();
  const [picked, setPicked] = useState<string[] | null>(null);
  const [game, setGame] = useState("");
  const [preset, setPreset] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [sums, setSums] = useState<Sum[]>([]);
  const [msg, setMsg] = useState("");

  const all = useMemo(() => (clients ?? []).map((c) => c.profile_id), [clients]);
  const selected = useMemo(() => picked ?? (preId ? [preId] : all), [picked, preId, all]);
  const allChecked = all.length > 0 && selected.length === all.length;

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (selected.length !== all.length) selected.forEach((i) => p.append("profile_id", i));
    if (game) p.set("game", game);
    if (preset) p.set("preset", preset);
    return p.toString();
  }, [selected, all, game, preset]);

  useEffect(() => {
    if (!clients || !clients.length) return;
    Promise.all([apiFetch(`/reports/results?${qs}`), apiFetch(`/reports/summary?${qs}`)])
      .then(async ([a, b]) => {
        setRows(a.ok ? await a.json() : []);
        setSums(b.ok ? await b.json() : []);
        setMsg(a.ok ? "" : "Не удалось загрузить результаты");
      })
      .catch(() => setMsg("Не удалось загрузить результаты"));
  }, [clients, qs]);

  async function xlsx() {
    const r = await apiFetch(`/reports/export.xlsx?${qs}`);
    if (!r.ok) return setMsg("Не удалось сформировать файл");
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = "results.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  const toggle = (id: string) => setPicked(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">Результаты и отчёты</h1>
      <fieldset className="mb-4">
        <legend className="mb-1 font-medium">Подопечные</legend>
        <label className="mb-1 flex items-center gap-2">
          <input type="checkbox" checked={allChecked} onChange={() => setPicked(allChecked ? [] : all)} />
          Выбрать всех
        </label>
        {(clients ?? []).map((c) => (
          <label key={c.profile_id} className="flex items-center gap-2">
            <input type="checkbox" checked={selected.includes(c.profile_id)} onChange={() => toggle(c.profile_id)} />
            {c.full_name || c.code}
          </label>
        ))}
      </fieldset>
      <div className="mb-4 flex flex-wrap gap-3">
        <select className="rounded border px-3 py-2" value={game} onChange={(e) => setGame(e.target.value)} aria-label="Игра">
          <option value="">Все игры</option>
          {games.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.title}
            </option>
          ))}
        </select>
        <select className="rounded border px-3 py-2" value={preset} onChange={(e) => setPreset(e.target.value)} aria-label="Период">
          {PERIODS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button className="rounded border px-3 py-2" onClick={xlsx} disabled={!selected.length}>
          Скачать xlsx
        </button>
      </div>
      {msg && <p role="alert">{msg}</p>}
      <div className="overflow-x-auto">
        <h2 className="mb-2 text-lg font-semibold">Сводка</h2>
        <table className="mb-6 w-full text-left text-sm">
          <thead>
            <tr>
              <th>Подопечный</th>
              <th>Игра</th>
              <th>Игр</th>
              <th>Средние</th>
            </tr>
          </thead>
          <tbody>
            {sums.map((s) => (
              <tr key={s.profile_id + s.game}>
                <td>{s.profile_name}</td>
                <td>{s.game}</td>
                <td>{s.count}</td>
                <td>{Object.entries(s.avg).map(([k, v]) => `${k}: ${v}`).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2 className="mb-2 text-lg font-semibold">Результаты</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Подопечный</th>
              <th>Игра</th>
              <th>Результат</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.played_at).toLocaleString("ru-RU")}</td>
                <td>{r.profile_name}</td>
                <td>{r.game}</td>
                <td>{Object.entries(r.result).map(([k, v]) => `${k}: ${String(v)}`).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="mt-2">Результатов нет</p>}
      </div>
    </main>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<p>Загрузка…</p>}>
      <ReportsView />
    </Suspense>
  );
}
