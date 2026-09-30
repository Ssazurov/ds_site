// Авторы в формате `[Имя](url)` (один или несколько через запятую) -> ссылки; остальной текст как есть.
const LINK = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/;
const SPLIT = /(\[[^\]]+\]\(https?:\/\/[^)\s]+\))/;

export default function AuthorLink({ value }: { value: string }) {
  return (
    <>
      {value.split(SPLIT).map((part, i) => {
        const m = LINK.exec(part);
        return m
          ? <a key={i} href={m[2]} target="_blank" rel="noreferrer">{m[1]}</a>
          : <span key={i}>{part}</span>;
      })}
    </>
  );
}

// Убирает ведущий H1 (после возможных картинок), если он дублирует заголовок страницы.
export function stripLeadingTitle(md: string, title: string): string {
  const norm = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
  return md.replace(/^((?:\s*!\[[^\]]*\]\([^)]*\)\s*)*)#[ \t]+(.+)\n+/, (m, pre: string, h: string) => {
    const a = norm(title), b = norm(h);
    return b && (a.startsWith(b) || b.startsWith(a)) ? pre : m;
  });
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
