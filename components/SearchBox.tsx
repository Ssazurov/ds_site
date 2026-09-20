// components/SearchBox.tsx — поле поиска внешнего статического сайта (ds_site#93).
// SearchInput — простое управляемое поле; UrlSearchBox — то же, но значение
// живёт в ?q= (с задержкой), остальные параметры URL сохраняются.
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SearchInput({
  value, onChange, placeholder = "Поиск",
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="search"
      className="fb-search"
      style={{ width: "100%", padding: "0.5rem 0.75rem", margin: "0 0 0.75rem" }}
      value={value}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function UrlSearchBox({ placeholder = "Поиск по материалам" }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const urlQ = useSearchParams().get("q") ?? "";
  const [value, setValue] = useState(urlQ);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const next = value.trim();
      if ((params.get("q") ?? "") === next) return;
      if (next) params.set("q", next);
      else params.delete("q");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
  }, [value, pathname, router]);

  return <SearchInput value={value} onChange={setValue} placeholder={placeholder} />;
}
