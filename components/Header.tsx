// components/Header.tsx
// Навигация: Статьи / Новости / Помощник (= "/") / Обучение (-> главный сайт)
// + меню "три черты" справа: Глоссарий, Слова, Ссылки, Избранное, О нас.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAssistantEnabled } from "@/lib/assistant-flag";
import { useSession } from "@/lib/cabinet-auth";
import "@/lib/scroll-restore"; // ds_site#167: регистрирует popstate-флаг раньше монтирования списков
import { MAIN_SITE } from "@/lib/main-site";

// Внешняя ссылка (главный сайт) – обычный <a>, внутренняя – next/link.
function NavLink({ href, ...rest }: React.ComponentProps<typeof Link>) {
  return String(href).startsWith("http") ? <a href={String(href)} {...(rest as object)} /> : <Link href={href} {...rest} />;
}

const NAV_ITEMS = [
  { href: "/articles", label: "Статьи" },
  { href: "/news", label: "Новости" },
  { href: "/", label: "Помощник" },
  { href: `${MAIN_SITE}/`, label: "Обучение" },
];

const MENU_ITEMS = [
  { href: "/glossary", label: "Глоссарий" },
  { href: "/words", label: "Слова" },
  { href: "/links", label: "Ссылки" },
  { href: "/favorites", label: "Избранное" },
  { href: "/docs", label: "Документация" },
  { href: "/download", label: "Скачать" },
  { href: `${MAIN_SITE}/about.html`, label: "О нас" },
];

function isActiveHref(pathname: string | null, href: string) {
  return href === "/" ? pathname === "/" : !!pathname?.startsWith(href);
}

export default function Header() {
  const pathname = usePathname();
  const assistantEnabled = useAssistantEnabled() === true;
  const { user } = useSession();
  const menuItems = [...MENU_ITEMS, user ? { href: "/cabinet", label: "Кабинет" } : { href: "/login", label: "Войти" }];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuActive = menuItems.some((item) => isActiveHref(pathname, item.href));

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
          <NavLink
            key={item.href}
            href={item.href}
            aria-current={isActiveHref(pathname, item.href) ? "page" : undefined}
          >
            {item.label}
          </NavLink>
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
              {menuItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  aria-current={isActiveHref(pathname, item.href) ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
