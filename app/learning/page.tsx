// app/learning/page.tsx — редирект на главный сайт (ds_site#244).
import RedirectPage from "@/components/RedirectPage";
import { MAIN_SITE } from "@/lib/main-site";

export const metadata = { title: "Обучение — Солнечный мир" };

export default function LearningPage() {
  return <RedirectPage to={`${MAIN_SITE}/`} />;
}
