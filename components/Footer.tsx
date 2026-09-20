// components/Footer.tsx
// Минимальный футер (ds_site#55): единственная задача — дать ссылку "О нас"
// на /about, т.к. в верхний нав её не добавляем (решение от 19.09.2026,
// зафиксировано в Header.tsx: Главная/Новости/Библиотека).

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <nav aria-label="Дополнительная навигация">
        <Link href="/about">О нас</Link>
        <span>
          Разработчик:{" "}
          <Link href="/about#developer">Сазуров Сергей Владимирович</Link>
        </span>
      </nav>
    </footer>
  );
}
