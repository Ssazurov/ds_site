"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/cabinet-auth";

type Perm = { resource: string; action: string; scope: string };
type Role = { name: string; permissions: Perm[] };
const ACTIONS = ["view", "edit", "execute"];
const SCOPES = ["own", "group", "all"];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    apiFetch("/roles")
      .then(async (r) => r.ok && setRoles(await r.json()))
      .catch(() => setMsg("Не удалось загрузить"));
  }, [tick]);

  const json = (b: unknown): RequestInit => ({ headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

  async function create() {
    const r = await apiFetch("/roles", { method: "POST", ...json({ name }) });
    setMsg(r.ok ? "" : "Имя роли: латиница, цифры, _; не занято");
    if (r.ok) setName("");
    setTick((t) => t + 1);
  }

  async function save(role: Role, perms: Perm[]) {
    const r = await apiFetch(`/roles/${role.name}/permissions`, { method: "PUT", ...json(perms) });
    setMsg(r.ok ? "" : "Не удалось сохранить права");
    setTick((t) => t + 1);
  }

  const edit = (role: Role, i: number, patch: Partial<Perm>) =>
    setRoles(roles.map((r) => (r.name === role.name ? { ...r, permissions: r.permissions.map((p, j) => (j === i ? { ...p, ...patch } : p)) } : r)));
  const add = (role: Role) =>
    setRoles(roles.map((r) => (r.name === role.name ? { ...r, permissions: [...r.permissions, { resource: "profile", action: "view", scope: "own" }] } : r)));
  const del = (role: Role, i: number) =>
    setRoles(roles.map((r) => (r.name === role.name ? { ...r, permissions: r.permissions.filter((_, j) => j !== i) } : r)));

  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">Роли и права</h1>
      <div className="mb-6 flex gap-2">
        <input className="flex-1 rounded border px-3 py-2" placeholder="Новая роль (латиница)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="rounded border px-3 py-2" onClick={create}>
          Создать
        </button>
      </div>
      {msg && <p role="alert">{msg}</p>}
      {roles.map((role) => (
        <section key={role.name} className="mb-6 rounded border p-3">
          <h2 className="mb-2 text-lg font-semibold">{role.name}</h2>
          {role.name === "admin" ? (
            <p>Роль защищена от изменений.</p>
          ) : (
            <>
              {role.permissions.map((p, i) => (
                <div key={i} className="mb-2 flex flex-wrap gap-2">
                  <input className="rounded border px-2 py-1" value={p.resource} onChange={(e) => edit(role, i, { resource: e.target.value })} aria-label="Ресурс" />
                  <select className="rounded border px-2 py-1" value={p.action} onChange={(e) => edit(role, i, { action: e.target.value })} aria-label="Действие">
                    {ACTIONS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                  <select className="rounded border px-2 py-1" value={p.scope} onChange={(e) => edit(role, i, { scope: e.target.value })} aria-label="Охват">
                    {SCOPES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <button className="text-sm underline" onClick={() => del(role, i)}>
                    Убрать
                  </button>
                </div>
              ))}
              <button className="mr-3 text-sm underline" onClick={() => add(role)}>
                + право
              </button>
              <button className="rounded border px-3 py-1" onClick={() => save(role, role.permissions)}>
                Сохранить
              </button>
            </>
          )}
        </section>
      ))}
    </main>
  );
}
