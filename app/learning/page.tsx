// app/learning/page.tsx — страница-описание приложения; ссылки ведут на отдельный сайт ds_app_site.

const DOCS = "https://ssazurov.github.io/ds_app_site";

export const metadata = { title: "Обучение — Солнечный мир" };

export default function LearningPage() {
  return (
    <main className="chat-shell">
      <header className="chat-header about-header">
        <h1>Приложение «Солнечный мир»</h1>
      </header>
      <section className="chat-panel about-text learning-text" aria-label="Обучение">
        <p>
          Карточки и социальные истории для детей с синдромом Дауна. Бесплатное
          приложение для занятий дома с родителями: картинки с озвучкой,
          короткие истории от первого лица (например, «Я мою руки»), подбор
          материалов по возрасту ребёнка.
        </p>
        <p><a className="btn" href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/app/`}>Открыть приложение в браузере</a></p>

        <h2>Для родителей</h2>
        <ul>
          <li>Приложение работает без интернета после загрузки и не требует регистрации.</li>
          <li>Мы просим только имя (можно псевдоним) и возраст ребёнка в годах. Эти данные остаются <strong>только на вашем устройстве</strong> и никуда не отправляются.</li>
          <li>Диагноз и другие сведения о здоровье вводить не нужно.</li>
          <li>Можно создать несколько профилей. Профиль удаляется в родительском разделе.</li>
        </ul>
        <p>
          Приложение не заменяет занятия со специалистом и не является
          медицинской рекомендацией. См. <a href={`${DOCS}/disclaimer.html`}>дисклеймер</a>.
        </p>

        <h2>Документы</h2>
        <ul>
          <li><a href={`${DOCS}/privacy.html`}>Политика конфиденциальности</a></li>
          <li><a href={`${DOCS}/terms.html`}>Пользовательское соглашение</a></li>
          <li><a href={`${DOCS}/consent.html`}>Согласие на обработку персональных данных</a></li>
          <li><a href={`${DOCS}/delete-data.html`}>Как удалить данные</a></li>
          <li><a href={`${DOCS}/contacts.html`}>Контакты</a></li>
        </ul>
      </section>
    </main>
  );
}
