// ============================================================================
// PUNTO DE ENTRADA: Inicialización y Orquestación en 3 Capas (Caja & Cocina)
// Véase CONVENTIONS.md para el mapa completo de módulos por responsabilidad.
// ============================================================================

import { initCloudSync } from './data/cloudSync.js';
import { showToast } from './ui/toast.js';
import { bindNavigationEvents, renderAllViews } from './ui/navigation.js';
import { bindHeaderAndSeverEvents } from './ui/headerKpisView.js';
import { bindOverviewEvents } from './ui/overviewView.js';
import { bindExpensesEvents } from './ui/expensesView.js';
import { bindCostsEvents } from './ui/costsView.js';
import { bindNotesEvents } from './ui/notesView.js';
import {
  bindAdvisorEvents,
  askAdvisor,
  initAdvisorModelsDiscovery
} from './ui/advisorView.js';
import { bindSyncModalEvents } from './ui/syncModalView.js';

function bootstrapApp() {
  const sharedDeps = { onRenderAll: renderAllViews };

  bindNavigationEvents();
  bindHeaderAndSeverEvents(sharedDeps);
  bindOverviewEvents(sharedDeps);
  bindExpensesEvents(sharedDeps);
  bindCostsEvents(sharedDeps);
  bindNotesEvents(sharedDeps);
  bindAdvisorEvents();
  bindSyncModalEvents(sharedDeps);

  renderAllViews();
  askAdvisor('¿Qué productos me dejan más y menos ganancia hoy?', true);
  initAdvisorModelsDiscovery();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js?v=8').catch(() => {});
  }

  initCloudSync({
    onRemoteRender: renderAllViews,
    onToast: showToast
  });

  window.addEventListener('offline', () => {
    showToast('Modo sin señal activo: todo se guarda en este dispositivo');
  });

  window.addEventListener('online', () => {
    showToast('Conexión recuperada: sincronizando con la nube');
  });
}

document.addEventListener('DOMContentLoaded', bootstrapApp);
