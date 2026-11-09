// app/about/page.tsx — редирект на главный сайт (ds_site#244).
import RedirectPage from "@/components/RedirectPage";
import { MAIN_SITE } from "@/lib/main-site";

export const metadata = { title: "О проекте — Солнечный мир" };

export default function AboutPage() {
  return <RedirectPage to={`${MAIN_SITE}/about.html`} />;
}
