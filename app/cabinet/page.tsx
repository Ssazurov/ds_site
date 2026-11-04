"use client";

import Link from "next/link";
import { CABINET_MENU, useSession } from "@/lib/cabinet-auth";

export default function CabinetHome() {
  const { user } = useSession();
  const menu = (user && CABINET_MENU[user.role]) || [];
  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">Кабинет</h1>
      <ul className="flex flex-col gap-2">
        {menu.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
