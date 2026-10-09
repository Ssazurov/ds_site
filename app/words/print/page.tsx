// app/words/print/page.tsx
// Печать набора карточек в PDF (ds_site#27, ADR-0027): раскладка A4, печать
// через window.print() (сохранение в PDF средствами браузера, без устройства
// онлайн на занятии). Шапка/подвал сайта скрыты через @media print.
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { imageSrc, loadWords, type Word } from "@/lib/words";

function PrintContent() {
  const params = useSearchParams();
  const ids = new Set((params.get("ids") ?? "").split(",").filter(Boolean));
  const [cards, setCards] = useState<Word[] | null>(null);

  useEffect(() => {
    loadWords().then((d) => setCards(d.words.filter((w) => ids.has(w.id))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  if (cards && cards.length === 0) {
    return (
      <main className="chat-shell print-hide">
        <p className="message">Карточки не выбраны. <Link href="/words">Вернуться в каталог</Link>.</p>
      </main>
    );
  }

  return (
    <main className="print-page">
      <div className="print-toolbar print-hide">
        <Link href="/words">← Каталог</Link>
        <button type="button" onClick={() => window.print()}>Печать / сохранить в PDF</button>
      </div>
      <div className="print-grid">
        {cards?.map((w) => {
          const src = imageSrc(w);
          return (
            <div className="print-card" key={w.id}>
              <div className="print-card-img">
                {src ? <img src={src} alt={w.lemma} /> : null}
              </div>
              <div className="print-card-label">{w.lemma}</div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="chat-shell"><p className="message">Загружаю...</p></div>}>
      <PrintContent />
    </Suspense>
  );
}
