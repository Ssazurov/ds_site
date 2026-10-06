// components/Snippet.tsx
// ADR-0029: фрагмент текста вокруг совпадения (q_scope=text); подсветка — на клиенте.

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");

export default function Snippet({ text, q }: { text?: string | null; q: string }) {
  if (!text) return null;
  // основа слова запроса: без последних 2 букв (для слов > 4 букв), чтобы ловить словоформы
  const stems = norm(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean).map((w) => (w.length > 4 ? w.slice(0, -2) : w));
  const parts = text.split(/([\p{L}\p{N}]+)/u);
  return (
    <p className="snippet">
      {parts.map((p, i) => (stems.some((s) => norm(p).startsWith(s)) && /[\p{L}\p{N}]/u.test(p) ? <mark key={i}>{p}</mark> : p))}
    </p>
  );
}
