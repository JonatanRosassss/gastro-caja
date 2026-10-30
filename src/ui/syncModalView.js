// ============================================================================
// CAPA DE UI: Modal de Sincronización en Nube y Respaldos (.json)
// Responsabilidad única: Conectar/desconectar URL de Firebase, forzar subida
// o bajada y exportar/importar copias de seguridad en archivo JSON.
// ============================================================================

import { getInitialState } from '../data/seed.js';
import { store, saveState } from '../data/store.js';
import {
  resetCloudBaseToLocal,
  startCloudSync,
  forcePushToCloud,
  pullFromFirebase
} from '../data/cloudSync.js';
import { showToast } from './toast.js';

export function bindSyncModalEvents({ onRenderAll }) {
  const openSync = () => {
    document.getElementById('inputFirebaseUrl').value = store.state.meta.firebaseUrl || '';
    document.getElementById('modalSync').hidden = false;
  };

  document.getElementById('btnOpenSyncModal').addEventListener('click', openSync);
  document.getElementById('btnMobileSync').addEventListener('click', openSync);
  document.getElementById('btnCloseSyncModal').addEventListener('click', () => {
    document.getElementById('modalSync').hidden = true;
  });

  document.getElementById('btnSaveFirebase').addEventListener('click', () => {
    const newUrl = document.getElementById('inputFirebaseUrl').value.trim();
    const changedUrl = newUrl !== (store.state.meta.firebaseUrl || '');
    store.state.meta.firebaseUrl = newUrl;
    saveState(false);
    if (changedUrl) resetCloudBaseToLocal();
    startCloudSync();
    showToast(newUrl ? 'Conectando en vivo con la nube' : 'Nube desconectada en este dispositivo');
  });

  document.getElementById('btnSyncPush').addEventListener('click', forcePushToCloud);
  document.getElementById('btnSyncPull').addEventListener('click', pullFromFirebase);

  document.getElementById('btnExportBackup').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo-caja-cocina-${store.activeDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('inputImportBackup').addEventListener('change', e => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed && parsed.products) {
          store.state = { ...getInitialState(), ...parsed };
          saveState();
          onRenderAll();
          document.getElementById('modalSync').hidden = true;
          showToast('Respaldo restaurado');
        }
      } catch (err) {
        showToast('Archivo inválido');
      }
    };
    r.readAsText(f);
  });
}
