"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/cabinet-auth";

type Client = { link_id: string; profile_id: string; code: string; full_name: string };
type Note = { id: string; text: string; created_at: string };

function ClientView() {
  const id = useSearchParams().get("id") ?? "";
  const [client, setClient] = useState<Client | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const loadNotes = useCallback(async () => {
    const r = await apiFetch(`/notes/${id}`);
    if (r.ok) setNotes(await r.json());
  }, [id]);

  useEffect(() => {
    if (!id) return;
    apiFetch("/links/mine")
      .then(async (r) => {
        const list: Client[] = r.ok ? await r.json() : [];
        const c = list.find((x) => x.profile_id === id) ?? null;
        setClient(c);
        if (!c) setError("Подопечный не найден");
        else await loadNotes();
      })
      .catch(() => setError("Не удалось загрузить данные"));
  }, [id, loadNotes]);

  async function add() {
    if (!text.trim()) return;
    const r = await apiFetch(`/notes/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (r.ok) {
      setText("");
      await loadNotes();
    } else setError("Не удалось сохранить заметку");
  }

  async function remove(noteId: string) {
    const r = await apiFetch(`/notes/${id}/${noteId}`, { method: "DELETE" });
    if (r.ok) await loadNotes();
  }

  if (!id) return <p>Не указан подопечный</p>;
  return (
    <main>
      <p className="mb-3">
        <Link href="/cabinet/clients/">← Подопечные</Link>
      </p>
      {error && <p role="alert">{error}</p>}
      {client && (
        <>
          <h1 className="mb-1 text-2xl font-semibold">{client.full_name || "Без имени"}</h1>
          <p className="mb-6">
            Код профиля: <span className="font-mono">{client.code}</span>
          </p>
          <h2 className="mb-2 text-xl font-semibold">Заметки</h2>
          <label className="block">
            <span className="sr-only">Новая заметка</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={4000}
              rows={3}
              className="w-full rounded border px-3 py-2"
            />
          </label>
          <button className="mt-2 rounded border px-3 py-2" onClick={add}>
            Добавить
          </button>
          <ul className="mt-4 flex flex-col gap-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded border px-3 py-2">
                <div className="text-sm opacity-70">{new Date(n.created_at).toLocaleString("ru-RU")}</div>
                <div className="whitespace-pre-wrap">{n.text}</div>
                <button className="mt-1 text-sm underline" onClick={() => remove(n.id)}>
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

export default function ClientPage() {
  return (
    <Suspense fallback={<p>Загрузка…</p>}>
      <ClientView />
    </Suspense>
  );
}
