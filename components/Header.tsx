// components/Header.tsx
// Навигация: Статьи / Новости / Помощник (= "/") / Обучение (/learning)
// + меню "три черты" справа: Глоссарий, Слова, Ссылки, Избранное, О нас.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAssistantEnabled } from "@/lib/assistant-flag";
import "@/lib/scroll-restore"; // ds_site#167: регистрирует popstate-флаг раньше монтирования списков

const NAV_ITEMS = [
  { href: "/articles", label: "Статьи" },
  { href: "/news", label: "Новости" },
  { href: "/", label: "Помощник" },
  { href: "/learning", label: "Обучение" },
];

const MENU_ITEMS = [
  { href: "/glossary", label: "Глоссарий" },
  { href: "/words", label: "Слова" },
  { href: "/links", label: "Ссылки" },
  { href: "/favorites", label: "Избранное" },
  { href: "/docs", label: "Документация" },
  { href: "/download", label: "Скачать" },
  { href: "/about", label: "О нас" },
];

function isActiveHref(pathname: string | null, href: string) {
  return href === "/" ? pathname === "/" : !!pathname?.startsWith(href);
}

export default function Header() {
  const pathname = usePathname();
  const assistantEnabled = useAssistantEnabled() === true;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuActive = MENU_ITEMS.some((item) => isActiveHref(pathname, item.href));

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header className="site-nav">
      <nav aria-label="Основная навигация">
        {NAV_ITEMS.filter((item) => item.href !== "/" || assistantEnabled).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActiveHref(pathname, item.href) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
        <div className="nav-burger" ref={menuRef}>
          <button
            type="button"
            className="nav-burger-trigger"
            aria-label="Меню"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-current={menuActive ? "page" : undefined}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
          {menuOpen && (
            <div className="nav-library-menu nav-burger-menu" role="menu">
              {MENU_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  aria-current={isActiveHref(pathname, item.href) ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
