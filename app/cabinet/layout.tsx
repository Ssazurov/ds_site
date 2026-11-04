"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CABINET_MENU, logout, useSession } from "@/lib/cabinet-auth";

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace("/login/");
  }, [loading, user, router]);

  if (loading || !user) return <main className="mx-auto max-w-4xl p-6">Загрузка…</main>;

  const menu = CABINET_MENU[user.role];
  if (!menu) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p>Для вашей роли кабинет недоступен.</p>
        <button className="mt-3 rounded border px-3 py-2" onClick={logout}>
          Выйти
        </button>
      </main>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <nav aria-label="Меню кабинета" className="mb-6 flex flex-wrap items-center gap-4 border-b pb-3">
        <Link href="/cabinet/" aria-current={pathname === "/cabinet/" || pathname === "/cabinet" ? "page" : undefined}>
          Кабинет
        </Link>
        {menu.map((item) => (
          <Link key={item.href} href={item.href} aria-current={pathname?.startsWith(item.href) ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
        <span className="ml-auto text-sm opacity-70">{user.full_name || user.login}</span>
        <button className="rounded border px-3 py-1 text-sm" onClick={logout}>
          Выйти
        </button>
      </nav>
      {children}
    </div>
  );
}
