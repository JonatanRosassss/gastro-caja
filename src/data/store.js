// ============================================================================
// CAPA DE DATOS: Almacén de Estado Centralizado y Persistencia Local
// Responsabilidad única: Mantener el estado de negocio y sesión UI, persistir
// en localStorage y notificar hooks de sincronización en nube.
// ============================================================================

import { getOffsetDateISO } from '../domain/formatters.js';
import { findIngredientById } from '../domain/costing.js';
import { getInitialState } from './seed.js';

export const STORAGE_KEY = 'gastro_caja_octubre_real_v1';

let cloudPushHandler = null;

export function registerCloudPushHandler(fn) {
  cloudPushHandler = fn;
}

export function loadState() {
  const initial = getInitialState();
  try {
    let savedGeminiKey = localStorage.getItem('gastro_gemini_key') || '';
    let savedGeminiModel = localStorage.getItem('gastro_gemini_model') || 'auto';
    let savedFirebaseUrl = localStorage.getItem('gastro_firebase_url') || '';

    if (!savedGeminiKey || !savedFirebaseUrl) {
      const legacyRaw = localStorage.getItem('gastro_caja_pro_v2');
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        if (legacy?.meta?.geminiApiKey && !savedGeminiKey) {
          savedGeminiKey = legacy.meta.geminiApiKey;
          localStorage.setItem('gastro_gemini_key', savedGeminiKey);
        }
        if (legacy?.meta?.firebaseUrl && !savedFirebaseUrl) {
          savedFirebaseUrl = legacy.meta.firebaseUrl;
          localStorage.setItem('gastro_firebase_url', savedFirebaseUrl);
        }
      }
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      initial.meta.geminiApiKey = savedGeminiKey;
      initial.meta.geminiModel = savedGeminiModel;
      initial.meta.firebaseUrl = savedFirebaseUrl;
      return initial;
    }

    const parsed = JSON.parse(raw);
    const merged = { ...initial, ...parsed, meta: { ...initial.meta, ...(parsed.meta || {}) } };
    if (savedGeminiKey && !merged.meta.geminiApiKey) merged.meta.geminiApiKey = savedGeminiKey;
    if (savedGeminiModel && !merged.meta.geminiModel) merged.meta.geminiModel = savedGeminiModel;
    if (savedFirebaseUrl) merged.meta.firebaseUrl = savedFirebaseUrl;
    if (!merged.meta.firebaseUrl) merged.meta.firebaseUrl = initial.meta.firebaseUrl;
    return merged;
  } catch (e) {
    return initial;
  }
}

export const store = {
  state: loadState(),
  currentOperator: 'Jonatan',
  currentPeriod: 'month',
  activeDate: getOffsetDateISO(0),
  activeCatFilter: 'all',
  draftCart: {},
  severHours: 4,
  severSelectedRate: 3750
};

export function saveState(pushCloud = true) {
  store.state.meta.lastUpdated = Date.now();
  if (store.state.meta.geminiApiKey !== undefined) {
    localStorage.setItem('gastro_gemini_key', store.state.meta.geminiApiKey);
  }
  if (store.state.meta.geminiModel !== undefined) {
    localStorage.setItem('gastro_gemini_model', store.state.meta.geminiModel);
  }
  if (store.state.meta.firebaseUrl !== undefined) {
    localStorage.setItem('gastro_firebase_url', store.state.meta.firebaseUrl);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store.state));
  if (pushCloud && typeof cloudPushHandler === 'function') {
    cloudPushHandler();
  }
}

export function getIngredientById(ingId) {
  return findIngredientById(store.state.ingredients, ingId);
}
