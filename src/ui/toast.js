// ============================================================================
// CAPA DE UI: Notificaciones Emergentes (Toast)
// Responsabilidad única: Mostrar avisos breves no bloqueantes en #toastRegion.
// ============================================================================

export function showToast(msg) {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = 'toast-banner';
  el.textContent = msg;
  region.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
