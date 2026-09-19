// components/Header.tsx
// Навигация сайта (ds_site#5, #14, #44): Главная / Новости / Статьи /
// Глоссарий / Ссылки. "Помощник" убран из верхнего меню (остаётся как
// внутренний route, используется из "Спросить по выбранным" в /articles).
// Группировка Статьи/Глоссарий/Ссылки в "Библиотека" — см. ds_site#45.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Главная" },
  { href: "/news", label: "Новости" },
  { href: "/articles", label: "Статьи" },
  { href: "/glossary", label: "Глоссарий" },
  { href: "/links", label: "Ссылки" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="site-nav">
      <nav aria-label="Основная навигация">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
