// ============================================================================
// CAPA DE DOMINIO: Formateadores de Moneda, Fechas y Texto
// Responsabilidad única: Funciones puras de transformación de strings, fechas y ARS.
// ============================================================================

export function getOffsetDateISO(daysAgo = 0) {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - offset - daysAgo * 86400000);
  return local.toISOString().slice(0, 10);
}

export function getCurrentTimeHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; // taste-skill-ignore: clock time
}

export function formatARS(num) {
  const n = Math.round(Number(num) || 0);
  const abs = Math.abs(n).toLocaleString('es-AR');
  return n < 0 ? `\u2212$${abs}` : `$${abs}`;
}

export function formatSignedARS(num) {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return '$0';
  const abs = Math.abs(n).toLocaleString('es-AR');
  return n > 0 ? `+$${abs}` : `\u2212$${abs}`;
}

export function normalizeText(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function formatMarkdownToHtml(md) {
  return String(md || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\s*[\*\-]\s+(.+)$/gm, '• $1')
    .replace(/\n/g, '<br>');
}
