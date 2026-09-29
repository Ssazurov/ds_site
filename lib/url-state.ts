// lib/url-state.ts
// Обновление query-параметров без router.replace: после прямого захода на страницу
// с ?query router.replace тихо не срабатывал (Next 16). Нативный history.replaceState
// синхронизируется с useSearchParams; относительный URL сохраняет basePath/trailingSlash.
export function replaceQuery(params: URLSearchParams) {
  const qs = params.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}
