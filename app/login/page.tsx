"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { login, useSession } from "@/lib/cabinet-auth";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace("/cabinet/");
  }, [user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await login(loginName, password);
    setBusy(false);
    if (err) setError(err);
  }

  if (loading || user) return <main className="mx-auto max-w-sm p-6">Загрузка…</main>;

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-semibold">Вход</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          Логин
          <input
            className="rounded border px-3 py-2"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          Пароль
          <input
            className="rounded border px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="rounded border px-3 py-2 font-medium disabled:opacity-50">
          {busy ? "Входим…" : "Войти"}
        </button>
      </form>
    </main>
  );
}
