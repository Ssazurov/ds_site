import type { NextConfig } from "next";

// Внешний статический сайт (ds_site#93, ADR-0018): NEXT_PUBLIC_STATIC_EXPORT=1.
// Внутренняя сборка (standalone + GAR-прокси) не меняется.
const isStatic = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

const nextConfig: NextConfig = isStatic
  ? {
      output: "export",
      basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
      trailingSlash: true,
      images: { unoptimized: true },
      // Route Handlers (app/api/**/route.ts) несовместимы с экспортом: в статической
      // сборке учитываем только *.tsx (page/layout), route.ts игнорируются.
      pageExtensions: ["tsx"],
    }
  : { output: "standalone" };

// Отдельный distDir (NEXT_DIST_DIR) — чтобы внешняя сборка не затирала .next внутренней.
if (process.env.NEXT_DIST_DIR) nextConfig.distDir = process.env.NEXT_DIST_DIR;

export default nextConfig;
