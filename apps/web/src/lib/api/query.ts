/**
 * Bangun query string dengan aman: nilai undefined/null/string kosong
 * dibuang, bukan di-stringify menjadi "undefined" (yang membuat backend
 * menolak request dengan 400 pada field tervalidasi seperti UUID).
 */
export function toQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, String(value)] as [string, string]);
  return new URLSearchParams(entries).toString();
}
