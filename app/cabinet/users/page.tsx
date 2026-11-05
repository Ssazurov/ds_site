"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/cabinet-auth";

type User = { id: string; login: string; role: string; full_name: string; is_active: boolean };
type Role = { name: string };
const json = (b: unknown): RequestInit => ({ headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ login: "", password: "", role: "specialist", full_name: "" });

  const load = useCallback(async () => {
    const [u, r] = await Promise.all([apiFetch("/users"), apiFetch("/roles")]);
    if (u.ok) setUsers(await u.json());
    if (r.ok) setRoles(((await r.json()) as Role[]).map((x) => x.name));
  }, []);
  useEffect(() => {
    Promise.all([apiFetch("/users"), apiFetch("/roles")])
      .then(async ([u, r]) => {
        if (u.ok) setUsers(await u.json());
        if (r.ok) setRoles(((await r.json()) as Role[]).map((x) => x.name));
      })
      .catch(() => setMsg("Не удалось загрузить"));
  }, []);

  async function create() {
    const r = await apiFetch("/users", { method: "POST", ...json(f) });
    if (r.ok) {
      setF({ ...f, login: "", password: "", full_name: "" });
      setMsg("");
      await load();
    } else setMsg(r.status === 409 ? "Логин занят" : "Проверьте поля (пароль от 8 символов)");
  }

  async function patch(id: string, body: Partial<User> & { password?: string }) {
    const r = await apiFetch(`/users/${id}`, { method: "PATCH", ...json(body) });
    setMsg(r.ok ? "" : "Не удалось изменить (себя менять нельзя)");
    await load();
  }

  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">Пользователи</h1>
      <div className="mb-6 grid gap-2 sm:grid-cols-2">
        <input className="rounded border px-3 py-2" placeholder="Логин" value={f.login} onChange={(e) => setF({ ...f, login: e.target.value })} />
        <input className="rounded border px-3 py-2" type="password" placeholder="Пароль (от 8)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <input className="rounded border px-3 py-2" placeholder="Имя" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
        <select className="rounded border px-3 py-2" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} aria-label="Роль">
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <button className="rounded border px-3 py-2" onClick={create}>
          Создать
        </button>
      </div>
      {msg && <p role="alert">{msg}</p>}
      <ul className="flex flex-col gap-2">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 rounded border px-3 py-2">
            <span className={u.is_active ? "" : "opacity-50"}>
              {u.login} {u.full_name && `(${u.full_name})`}
            </span>
            <select className="rounded border px-2 py-1" value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })} aria-label="Роль">
              {roles.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <button className="text-sm underline" onClick={() => patch(u.id, { is_active: !u.is_active })}>
              {u.is_active ? "Отключить" : "Включить"}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
