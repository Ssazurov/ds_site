// components/Header.tsx
// Навигация сайта (ds_site#5, #14): Главная / Помощник / Статьи / Новости /
// Глоссарий / Ссылки.

import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Главная" },
  { href: "/assistant", label: "Помощник" },
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
