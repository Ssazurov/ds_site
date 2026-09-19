// components/Header.tsx
// Навигация сайта (ds_site#5, #14, #44, #45): Главная / Новости / Библиотека
// (dropdown: Статьи/Глоссарий/Ссылки). "Помощник" убран из верхнего меню
// (остаётся как внутренний route, используется из "Спросить по выбранным"
// в /articles).

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Главная" },
  { href: "/news", label: "Новости" },
];

const LIBRARY_ITEMS = [
  { href: "/articles", label: "Статьи" },
  { href: "/glossary", label: "Глоссарий" },
  { href: "/links", label: "Ссылки" },
];

function isActiveHref(pathname: string | null, href: string) {
  return href === "/" ? pathname === "/" : !!pathname?.startsWith(href);
}

export default function Header() {
  const pathname = usePathname();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const libraryRef = useRef<HTMLDivElement>(null);
  const libraryActive = LIBRARY_ITEMS.some((item) => isActiveHref(pathname, item.href));

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (libraryRef.current && !libraryRef.current.contains(e.target as Node)) {
        setLibraryOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header className="site-nav">
      <nav aria-label="Основная навигация">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActiveHref(pathname, item.href) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
        <div
          className="nav-library"
          ref={libraryRef}
          onMouseEnter={() => setLibraryOpen(true)}
          onMouseLeave={() => setLibraryOpen(false)}
        >
          <button
            type="button"
            className="nav-library-trigger"
            aria-haspopup="true"
            aria-expanded={libraryOpen}
            aria-current={libraryActive ? "page" : undefined}
            onClick={() => setLibraryOpen((v) => !v)}
          >
            Библиотека
          </button>
          {libraryOpen && (
            <div className="nav-library-menu" role="menu">
              {LIBRARY_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  aria-current={isActiveHref(pathname, item.href) ? "page" : undefined}
                  onClick={() => setLibraryOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
        <Link href="/about" aria-current={isActiveHref(pathname, "/about") ? "page" : undefined}>
          О нас
        </Link>
      </nav>
    </header>
  );
}
