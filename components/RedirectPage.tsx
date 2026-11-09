// components/RedirectPage.tsx — клиентский редирект на главный сайт (статическая сборка, ds_site#244).
"use client";

import { useEffect } from "react";


export default function RedirectPage({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return (
    <main className="chat-shell">
      <meta httpEquiv="refresh" content={`0;url=${to}`} />
      <p>
        Страница переехала на главный сайт: <a href={to}>{to}</a>
      </p>
    </main>
  );
}
