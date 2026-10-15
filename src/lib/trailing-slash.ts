/**
 * GitHub Pages serves each prerendered route from `<route>/index.html` and
 * 301-redirects the bare path to `<route>/`. A link to the bare path makes
 * Search Console report "Page with redirect", so internal route links name the
 * trailing-slash form that answers 200. React Router matches both forms.
 */
export function withTrailingSlash(to: string): string {
  const match = /^([^?#]*)(.*)$/.exec(to);
  const path = match?.[1] ?? to;
  const rest = match?.[2] ?? "";
  if (!path.startsWith("/") || path.endsWith("/") || /\.[a-z0-9]+$/i.test(path)) return to;
  return `${path}/${rest}`;
}
