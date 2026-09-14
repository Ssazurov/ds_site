// lib/gar.ts
//
// Тонкий серверный клиент к GAR-core-api /public/*.
//
// РЕШЕНИЕ (2026-09-08, см. ds_search#26): пока до продакшна далеко,
// ходим напрямую на localhost без Cloudflare Tunnel / Zero Trust Access.
// Единственная защита — X-Public-Api-Key (см. gar-core-api/services/public_gateway.py).
//
// Когда понадобится внешний доступ — вернуться к полному плану:
//   1. cloudflared tunnel login/create/route dns
//   2. Zero Trust -> Access app + Service Token для ds_site
//   3. GAR_URL меняется на публичный хостнейм тоннеля, добавляется
//      Service Token в заголовках запроса ниже
//   4. python -m scripts.seed_public_acl <dataset_id> (в gar-core-api)
// Код проксирования при этом не меняется - меняются только ENV и заголовки.

const GAR_URL = process.env.GAR_URL ?? "http://localhost:8000";
const GAR_PUBLIC_API_KEY = process.env.GAR_PUBLIC_API_KEY;

function headers(): HeadersInit {
  if (!GAR_PUBLIC_API_KEY) {
    throw new Error("GAR_PUBLIC_API_KEY не задан (см. .env.local.example)");
  }
  return {
    "Content-Type": "application/json",
    "X-Public-Api-Key": GAR_PUBLIC_API_KEY,
  };
}

export async function garChat(body: unknown) {
  return fetch(`${GAR_URL}/public/chat`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
}

export async function garScopeTree(params: URLSearchParams) {
  return fetch(`${GAR_URL}/public/documents/scope-tree?${params.toString()}`, {
    headers: headers(),
  });
}

export async function garDocuments(params: URLSearchParams) {
  return fetch(`${GAR_URL}/public/documents?${params.toString()}`, {
    headers: headers(),
  });
}

export async function garDocumentDetail(id: string) {
  return fetch(`${GAR_URL}/public/documents/${id}`, { headers: headers() });
}

export async function garDocumentContent(id: string) {
  return fetch(`${GAR_URL}/public/documents/${id}/content`, { headers: headers() });
}
