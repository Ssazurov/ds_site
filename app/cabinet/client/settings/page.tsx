"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import SchemaForm from "@/components/cabinet/SchemaForm";
import { apiFetch } from "@/lib/cabinet-auth";
import { useClients, useGames } from "@/lib/cabinet-clients";

type Values = Record<string, unknown>;

function SettingsView() {
  const id = useSearchParams().get("id") ?? "";
  const clients = useClients();
  const games = useGames();
  const [slug, setSlug] = useState("");
  const [values, setValues] = useState<Values>({});
  const [source, setSource] = useState("");
  const [msg, setMsg] = useState("");
  const client = clients?.find((c) => c.profile_id === id);
  const game = games.find((g) => g.slug === (slug || games[0]?.slug));
  const gslug = game?.slug ?? "";

  useEffect(() => {
    if (!client || !gslug) return;
    apiFetch(`/settings/${client.link_id}/${gslug}`)
      .then(async (r) => setValues(r.ok ? (await r.json()).settings : {}))
      .catch(() => setMsg("Не удалось загрузить настройки"));
  }, [client, gslug]);

  async function save() {
    if (!client) return;
    const r = await apiFetch(`/settings/${client.link_id}/${gslug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: values }),
    });
    setMsg(r.ok ? "Сохранено" : "Ошибка сохранения: проверьте значения");
  }

  async function copy() {
    const src = clients?.find((c) => c.profile_id === source);
    if (!client || !src) return;
    const r = await apiFetch(`/settings/${client.link_id}/${gslug}/copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_link_id: src.link_id }),
    });
    if (r.ok) {
      setValues((await r.json()).settings);
      setMsg(`Скопировано от: ${src.full_name || src.code}`);
    } else setMsg("Не удалось скопировать");
  }

  if (!id) return <p>Не указан подопечный</p>;
  return (
    <main>
      <p className="mb-3">
        <Link href={`/cabinet/client/?id=${id}`}>← Профиль</Link>
      </p>
      <h1 className="mb-4 text-2xl font-semibold">Настройки: {client?.full_name || client?.code || ""}</h1>
      <label className="mb-4 flex flex-col gap-1">
        Игра
        <select className="rounded border px-3 py-2" value={gslug} onChange={(e) => setSlug(e.target.value)}>
          {games.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.title}
            </option>
          ))}
        </select>
      </label>
      {game && <SchemaForm schema={game.settings_schema} values={values} onChange={setValues} />}
      <button className="mt-4 rounded border px-3 py-2" onClick={save}>
        Сохранить
      </button>
      <section className="mt-6">
        <h2 className="mb-2 text-lg font-semibold">Скопировать у другого подопечного</h2>
        <div className="flex gap-2">
          <select className="flex-1 rounded border px-3 py-2" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Источник">
            <option value="">Выберите…</option>
            {(clients ?? [])
              .filter((c) => c.profile_id !== id)
              .map((c) => (
                <option key={c.profile_id} value={c.profile_id}>
                  {c.full_name || c.code}
                </option>
              ))}
          </select>
          <button className="rounded border px-3 py-2" onClick={copy} disabled={!source}>
            Копировать
          </button>
        </div>
      </section>
      {msg && <p role="status" className="mt-3">{msg}</p>}
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<p>Загрузка…</p>}>
      <SettingsView />
    </Suspense>
  );
}
