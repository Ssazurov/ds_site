// lib/cabinet-auth.ts
// Вход в кабинет (ds_api): логин/пароль → токен в localStorage, роль из /auth/me.
// Клиентская сессия — работает и в standalone, и в статическом экспорте.

"use client";

import { useCallback, useEffect, useState } from "react";

export const DS_API_URL = process.env.NEXT_PUBLIC_DS_API_URL ?? "http://localhost:8300";
const TOKEN_KEY = "ds_token";

export type CabinetUser = { id: string; login: string; role: string; full_name?: string };
export type MenuItem = { href: string; label: string };

// Меню кабинета по роли; роли без записи — без доступа.
export const CABINET_MENU: Record<string, MenuItem[]> = {
  admin: [
    { href: "/cabinet/users", label: "Пользователи" },
    { href: "/cabinet/profiles", label: "Профили" },
    { href: "/cabinet/links", label: "Связи" },
    { href: "/cabinet/roles", label: "Роли" },
  ],
  specialist: [
    { href: "/cabinet/clients", label: "Подопечные" },
    { href: "/cabinet/reports", label: "Результаты" },
  ],
};

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* хранилище недоступно — сессия не сохранится */
  }
  window.dispatchEvent(new Event("ds-auth"));
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${DS_API_URL}${path}`, { ...init, headers });
  if (res.status === 401 && token) setToken(null); // токен просрочен/отозван
  return res;
}

export async function login(loginName: string, password: string): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(`${DS_API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: loginName, password }),
    });
  } catch {
    return "Сервер недоступен";
  }
  if (res.status === 401) return "Неверный логин или пароль";
  if (!res.ok) return "Ошибка входа";
  const data = await res.json();
  setToken(data.access_token);
  return null;
}

export function logout() {
  setToken(null);
}

// loading=true, пока сессия проверяется; user=null — не вошёл.
export function useSession() {
  const [state, setState] = useState<{ user: CabinetUser | null; loading: boolean }>({
    user: null,
    loading: true,
  });

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setState({ user: null, loading: false });
      return;
    }
    try {
      const res = await apiFetch("/auth/me");
      setState({ user: res.ok ? await res.json() : null, loading: false });
    } catch {
      setState({ user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener("ds-auth", refresh);
    return () => window.removeEventListener("ds-auth", refresh);
  }, [refresh]);

  return state;
}
