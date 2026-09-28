// Автор в формате `[Имя](url)` -> ссылка; иначе обычный текст.
const RE = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/;

export default function AuthorLink({ value }: { value: string }) {
  const m = RE.exec(value.trim());
  if (!m) return <>{value}</>;
  return <a href={m[2]} target="_blank" rel="noreferrer">{m[1]}</a>;
}

// Автор уже показан в шапке — убираем строку `Автор: ...` из тела, сохраняя `Журнал: ...`.
export function stripAuthorLine(md: string): string {
  return md.replace(/^[ \t]*Авторы?:.*$/gm, (line) => {
    const i = line.indexOf("Журнал:");
    return i >= 0 ? line.slice(i) : "";
  });
}

// Ссылка на источник по требованию правообладателя (foma.ru): title, текст «Заголовок — домен»,
// без nofollow/sponsored/noindex.
export function SourceLink({ url, title, short }: { url: string; title: string; short?: boolean }) {
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
  const text = short && host ? host : `${title}${host ? ` — ${host}` : ""}`;
  return (
    <a href={url} title={title} target="_blank" rel="noreferrer">
      {text} <span aria-hidden="true">↗</span>
    </a>
  );
}
