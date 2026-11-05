"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./cabinet-auth";

export type Client = { link_id: string; profile_id: string; code: string; full_name: string };
export type Game = { slug: string; title: string; settings_schema: Schema; is_active: boolean };
export type Schema = {
  properties?: Record<string, { type?: string; title?: string; enum?: string[]; default?: unknown; minimum?: number; maximum?: number }>;
};

export function useClients(): Client[] | null {
  const [clients, setClients] = useState<Client[] | null>(null);
  useEffect(() => {
    apiFetch("/links/mine")
      .then(async (r) => setClients(r.ok ? await r.json() : []))
      .catch(() => setClients([]));
  }, []);
  return clients;
}

export function useGames(): Game[] {
  const [games, setGames] = useState<Game[]>([]);
  useEffect(() => {
    apiFetch("/games")
      .then(async (r) => {
        if (r.ok) setGames(((await r.json()) as Game[]).filter((g) => g.is_active));
      })
      .catch(() => {});
  }, []);
  return games;
}
