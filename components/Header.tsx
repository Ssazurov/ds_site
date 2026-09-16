// components/Header.tsx
// Минимальная навигация сайта: Главная / Статьи / Ссылки (ds_site#5).
// TODO: расширять по мере появления новых разделов (см. CURRENT_STATUS.md).

import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Главная" },
  { href: "/articles", label: "Статьи" },
  { href: "/news", label: "Новости" },
  { href: "/glossary", label: "Глоссарий" },
  { href: "/links", label: "Ссылки" },
];

export default function Header() {
  return (
    <header className="site-nav">
      <nav aria-label="Основная навигация">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
