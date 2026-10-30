// ============================================================================
// CAPA DE DATOS: Sincronización en Tiempo Real con Firebase Realtime Database
// Responsabilidad única: Mantener stream SSE (EventSource), hacer fusión de
// 3 vías con tombstones por ID y respaldar estado sucio en localStorage.
// ============================================================================

import { getInitialState } from './seed.js';
import { store, saveState, registerCloudPushHandler } from './store.js';

const CLOUD_PATH = 'gastro_caja_live';
const LEGACY_CLOUD_PATH = 'gastro_caja_v2';
const SYNC_KEYS = Object.keys(getInitialState());
const DEVICE_META_KEYS = ['firebaseUrl', 'geminiApiKey', 'geminiModel', 'lastUpdated'];
const SYNC_DIRTY_STORAGE = 'gastro_sync_dirty';
const SYNC_BASE_STORAGE = 'gastro_sync_base';

const cloud = {
  source: null,
  ready: false,
  status: 'off',
  known: {},
  dirty: new Set(),
  awaiting: {},
  inflight: false,
  flushTimer: null,
  retryTimer: null,
  pendingRender: false,
  onRemoteRender: null,
  onToast: null
};

export function cloudBaseUrl() {
  return (store.state.meta.firebaseUrl || '').trim().replace(/\/+$/, '');
}

function cloudValueOf(key) {
  if (key === 'meta') {
    const m = { ...(store.state.meta || {}) };
    DEVICE_META_KEYS.forEach(k => delete m[k]);
    return JSON.stringify(m);
  }
  return JSON.stringify(store.state[key] === undefined ? null : store.state[key]);
}

function setFromCloudForm(key, val) {
  const defaults = getInitialState();
  if (key === 'meta') {
    const local = {};
    DEVICE_META_KEYS.forEach(k => {
      if (store.state.meta && store.state.meta[k] !== undefined) local[k] = store.state.meta[k];
    });
    store.state.meta = {
      ...defaults.meta,
      ...(val && typeof val === 'object' ? val : {}),
      ...local
    };
    return;
  }
  if (val === null || val === undefined) {
    store.state[key] = Array.isArray(defaults[key]) ? [] : defaults[key];
  } else {
    store.state[key] = val;
  }
}

function safeParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return undefined;
  }
}

function persistCloudBookkeeping() {
  try {
    localStorage.setItem(SYNC_DIRTY_STORAGE, JSON.stringify([...cloud.dirty]));
    localStorage.setItem(SYNC_BASE_STORAGE, JSON.stringify(cloud.known));
  } catch (e) {
    // Si el almacenamiento está lleno, la sincronización sigue en memoria
  }
}

function snapshotLocalIds() {
  cloud.prevIds = {
    products: new Set((store.state.products || []).map(p => p.id)),
    sales: new Set((store.state.sales || []).map(s => s.id)),
    expenses: new Set((store.state.expenses || []).map(e => e.id)),
    ingredients: new Set((store.state.ingredients || []).map(i => i.id)),
    buyList: new Set((store.state.buyList || []).map(b => b.id)),
    todoList: new Set((store.state.todoList || []).map(t => t.id))
  };
}

function detectLocalDeletions() {
  if (!cloud.prevIds) snapshotLocalIds();
  store.state.meta.deleted = store.state.meta.deleted || {};
  let changed = false;
  ['products', 'sales', 'expenses', 'ingredients', 'buyList', 'todoList'].forEach(col => {
    const curr = new Set((store.state[col] || []).map(x => x.id));
    (cloud.prevIds[col] || new Set()).forEach(id => {
      if (!curr.has(id)) {
        store.state.meta.deleted[id] = Date.now();
        changed = true;
      }
    });
  });
  snapshotLocalIds();
  if (changed) {
    const keys = Object.keys(store.state.meta.deleted);
    if (keys.length > 300) {
      keys.sort((a, b) => store.state.meta.deleted[a] - store.state.meta.deleted[b]);
      for (let i = 0; i < keys.length - 300; i++) delete store.state.meta.deleted[keys[i]];
    }
    cloud.dirty.add('meta');
  }
}

function mergeThreeWay(key, base, local, remote) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (same(local, remote)) return local;

  if (key === 'meta') {
    const b = base && typeof base === 'object' ? base : {};
    const l = local && typeof local === 'object' ? local : {};
    const r = remote && typeof remote === 'object' ? remote : {};
    const out = { ...b, ...r, ...l };
    out.deleted = { ...(b.deleted || {}), ...(r.deleted || {}), ...(l.deleted || {}) };
    return out;
  }

  const isIdList = a => Array.isArray(a) && a.every(x => x && typeof x === 'object' && x.id !== undefined);
  const baseList = Array.isArray(base) ? base : [];
  const localList = Array.isArray(local) ? local : [];
  const remoteList = Array.isArray(remote) ? remote : [];

  if (isIdList(localList) && isIdList(remoteList)) {
    const deletedMap = store.state.meta?.deleted || {};
    const B = new Map(baseList.map(x => [x.id, x]));
    const L = new Map(localList.map(x => [x.id, x]));
    const R = new Map(remoteList.map(x => [x.id, x]));
    const keep = new Map();

    const allIds = new Set([...L.keys(), ...R.keys()]);
    allIds.forEach(id => {
      if (deletedMap[id]) return;
      const l = L.get(id);
      const r = R.get(id);
      const b = B.get(id);

      if (l && r) {
        keep.set(id, b && same(l, b) ? r : l);
      } else if (l) {
        keep.set(id, l);
      } else if (r) {
        keep.set(id, r);
      }
    });

    const order = remoteList.map(x => x.id).filter(id => keep.has(id));
    localList.forEach(x => {
      if (keep.has(x.id) && !order.includes(x.id)) {
        order.push(x.id);
      }
    });
    return order.map(id => keep.get(id));
  }

  return local;
}

export function setCloudStatus(status) {
  cloud.status = status;
  const labels = {
    off: ['Nube', 'Sincronizar'],
    connecting: ['Conectando', 'Conectando'],
    live: ['En vivo', 'En vivo'],
    saving: ['Guardando', 'Guardando'],
    offline: ['Sin señal', 'Sin señal'],
    error: ['Error nube', 'Error nube']
  };
  const [shortLabel, longLabel] = labels[status] || labels.off;
  const mobile = document.getElementById('btnMobileSync');
  const desk = document.getElementById('btnOpenSyncModal');
  if (mobile) {
    mobile.dataset.sync = status;
    const span = mobile.querySelector('.sync-label');
    if (span) span.textContent = shortLabel;
  }
  if (desk) {
    desk.dataset.sync = status;
    const span = desk.querySelector('.sync-label');
    if (span) span.textContent = longLabel;
  }
  const detail = document.getElementById('syncStatusDetail');
  if (detail) {
    const texts = {
      off: 'Sin conectar. Los datos quedan solo en este dispositivo.',
      connecting: 'Conectando con la nube...',
      live: 'En vivo: los cambios de cualquier dispositivo aparecen al instante.',
      saving: 'Guardando cambios en la nube...',
      offline: 'Sin señal: se guarda en este dispositivo y se sube solo al volver la conexión.',
      error: 'No se pudo hablar con la nube. Reintentando...'
    };
    detail.textContent = texts[status] || texts.off;
  }
}

function renderAfterRemoteChange() {
  const ae = document.activeElement;
  if (ae && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName)) {
    cloud.pendingRender = true;
    return;
  }
  cloud.pendingRender = false;
  if (typeof cloud.onRemoteRender === 'function') {
    cloud.onRemoteRender();
  }
}

export function queueCloudPush() {
  if (!cloudBaseUrl()) return;
  detectLocalDeletions();
  SYNC_KEYS.forEach(k => {
    if (cloudValueOf(k) !== cloud.known[k]) cloud.dirty.add(k);
  });
  persistCloudBookkeeping();
  scheduleCloudFlush(250);
}

function scheduleCloudFlush(delay = 250) {
  clearTimeout(cloud.flushTimer);
  cloud.flushTimer = setTimeout(flushCloud, delay);
}

async function flushCloud() {
  if (!cloudBaseUrl() || !cloud.ready || cloud.inflight || !cloud.dirty.size) return;
  if (!navigator.onLine) {
    setCloudStatus('offline');
    return;
  }
  const keys = [...cloud.dirty];
  const body = {};
  keys.forEach(k => (body[k] = cloudValueOf(k)));
  cloud.inflight = true;
  setCloudStatus('saving');
  try {
    const res = await fetch(`${cloudBaseUrl()}/${CLOUD_PATH}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    keys.forEach(k => {
      if (cloudValueOf(k) === body[k]) cloud.dirty.delete(k);
    });
    persistCloudBookkeeping();
    setCloudStatus(cloud.source && cloud.source.readyState === 1 ? 'live' : 'connecting');
  } catch (e) {
    setCloudStatus(navigator.onLine ? 'error' : 'offline');
    clearTimeout(cloud.retryTimer);
    cloud.retryTimer = setTimeout(flushCloud, 5000);
  } finally {
    cloud.inflight = false;
    if (cloud.dirty.size && cloud.status !== 'error' && cloud.status !== 'offline') {
      scheduleCloudFlush(250);
    }
  }
}

function receiveCloudKey(key, str, isFullSnapshot) {
  if (!SYNC_KEYS.includes(key)) return false;
  if (typeof str !== 'string') {
    if (isFullSnapshot) cloud.dirty.add(key);
    return false;
  }
  const currentLocal = cloudValueOf(key);
  if (str === currentLocal) {
    cloud.known[key] = str;
    cloud.dirty.delete(key);
    return false;
  }
  const remote = safeParse(str);
  if (remote === undefined) return false;

  const base = cloud.known[key] !== undefined ? safeParse(cloud.known[key]) : remote;
  const local = safeParse(currentLocal);
  const merged = mergeThreeWay(key, base, local, remote);

  cloud.known[key] = str;
  const before = currentLocal;
  setFromCloudForm(key, merged);
  const after = cloudValueOf(key);

  if (after === str) {
    cloud.dirty.delete(key);
  } else {
    cloud.dirty.add(key);
  }
  return after !== before;
}

async function seedCloudFromLegacyIfNewer() {
  try {
    const res = await fetch(`${cloudBaseUrl()}/${LEGACY_CLOUD_PATH}.json`);
    const legacy = await res.json();
    const legacyTime = Number(legacy?.meta?.lastUpdated) || 0;
    const localTime = Number(store.state.meta.lastUpdated) || 0;
    if (legacy && legacy.products && legacyTime > localTime) {
      SYNC_KEYS.forEach(k => {
        if (k === 'meta') {
          const m = { ...(legacy.meta || {}) };
          DEVICE_META_KEYS.forEach(d => delete m[d]);
          setFromCloudForm('meta', m);
        } else {
          setFromCloudForm(k, legacy[k]);
        }
      });
      return true;
    }
  } catch (e) {
    // Sin respaldo viejo
  }
  return false;
}

async function handleCloudEvent(kind, rawData) {
  const msg = safeParse(rawData);
  if (!msg || typeof msg.path !== 'string') return;
  const segments = msg.path.split('/').filter(Boolean);
  let changed = false;

  if (kind === 'put' && segments.length === 0) {
    const doc = msg.data && typeof msg.data === 'object' ? msg.data : null;
    if (!doc && !cloud.ready) {
      changed = await seedCloudFromLegacyIfNewer();
      SYNC_KEYS.forEach(k => cloud.dirty.add(k));
    } else {
      if (doc && doc.meta) {
        if (receiveCloudKey('meta', doc.meta, true)) changed = true;
      }
      SYNC_KEYS.forEach(k => {
        if (k !== 'meta') {
          if (receiveCloudKey(k, doc ? doc[k] : undefined, true)) changed = true;
        }
      });
    }
    snapshotLocalIds();
    cloud.ready = true;
  } else if (kind === 'put' && segments.length === 1) {
    changed = receiveCloudKey(segments[0], msg.data, false);
    snapshotLocalIds();
  } else if (kind === 'patch' && segments.length === 0 && msg.data) {
    if (msg.data.meta) {
      if (receiveCloudKey('meta', msg.data.meta, false)) changed = true;
    }
    Object.keys(msg.data).forEach(k => {
      if (k !== 'meta') {
        if (receiveCloudKey(k, msg.data[k], false)) changed = true;
      }
    });
    snapshotLocalIds();
  }

  persistCloudBookkeeping();
  if (changed) {
    saveState(false);
    renderAfterRemoteChange();
  }
  if (cloud.dirty.size) scheduleCloudFlush(50);
  else if (!cloud.inflight) setCloudStatus('live');
}

export function startCloudSync() {
  stopCloudSync();
  if (!cloudBaseUrl()) {
    setCloudStatus('off');
    return;
  }
  if (typeof EventSource === 'undefined') {
    setCloudStatus('error');
    return;
  }
  cloud.ready = false;
  setCloudStatus(navigator.onLine ? 'connecting' : 'offline');

  let chain = Promise.resolve();
  const enqueue = (kind, data) => {
    chain = chain.then(() => handleCloudEvent(kind, data)).catch(() => {});
  };
  const es = new EventSource(`${cloudBaseUrl()}/${CLOUD_PATH}.json`);
  es.addEventListener('put', e => enqueue('put', e.data));
  es.addEventListener('patch', e => enqueue('patch', e.data));
  es.addEventListener('cancel', () => {
    setCloudStatus('error');
    if (cloud.onToast) cloud.onToast('La nube rechazó la conexión: revisá las reglas de Firebase');
  });
  es.onerror = () => {
    setCloudStatus(navigator.onLine ? 'connecting' : 'offline');
  };
  cloud.source = es;
}

export function stopCloudSync() {
  if (cloud.source) cloud.source.close();
  cloud.source = null;
  cloud.ready = false;
  clearTimeout(cloud.flushTimer);
  clearTimeout(cloud.retryTimer);
}

export function resetCloudBaseToLocal() {
  cloud.known = {};
  SYNC_KEYS.forEach(k => (cloud.known[k] = cloudValueOf(k)));
  cloud.dirty.clear();
  cloud.awaiting = {};
  persistCloudBookkeeping();
}

export function initCloudSync({ onRemoteRender, onToast } = {}) {
  cloud.onRemoteRender = onRemoteRender;
  cloud.onToast = onToast;
  registerCloudPushHandler(queueCloudPush);

  const savedBase = safeParse(localStorage.getItem(SYNC_BASE_STORAGE) || 'null');
  const savedDirty = safeParse(localStorage.getItem(SYNC_DIRTY_STORAGE) || 'null');
  cloud.known = {};
  SYNC_KEYS.forEach(k => {
    cloud.known[k] = savedBase && typeof savedBase[k] === 'string' ? savedBase[k] : cloudValueOf(k);
  });
  cloud.dirty = new Set(Array.isArray(savedDirty) ? savedDirty.filter(k => SYNC_KEYS.includes(k)) : []);

  document.addEventListener('focusout', () => {
    setTimeout(() => {
      if (cloud.pendingRender) renderAfterRemoteChange();
    }, 0);
  });
  window.addEventListener('online', () => {
    if (cloudBaseUrl()) {
      if (!cloud.source || cloud.source.readyState === 2) startCloudSync();
      scheduleCloudFlush(100);
    }
  });
  window.addEventListener('offline', () => {
    if (cloudBaseUrl()) setCloudStatus('offline');
  });
  startCloudSync();
}

export async function forcePushToCloud() {
  if (!cloudBaseUrl()) {
    if (cloud.onToast) cloud.onToast('Ingresá primero la URL de Firebase');
    return;
  }
  SYNC_KEYS.forEach(k => {
    cloud.dirty.add(k);
    cloud.known[k] = undefined;
  });
  persistCloudBookkeeping();
  if (!cloud.ready) {
    if (cloud.onToast) cloud.onToast('Conectando con la nube, se subirá en segundos');
    return;
  }
  await flushCloud();
  if (cloud.onToast) {
    cloud.onToast(
      cloud.dirty.size ? 'Sin conexión: se subirá al volver la señal' : 'Datos enviados a la nube'
    );
  }
}

export async function pullFromFirebase() {
  if (!cloudBaseUrl()) {
    if (cloud.onToast) cloud.onToast('Ingresá primero la URL de Firebase');
    return;
  }
  try {
    const res = await fetch(`${cloudBaseUrl()}/${CLOUD_PATH}.json`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const doc = await res.json();
    if (!doc) {
      if (cloud.onToast) cloud.onToast('La nube todavía está vacía');
      return;
    }
    cloud.dirty.clear();
    cloud.awaiting = {};
    SYNC_KEYS.forEach(k => {
      if (typeof doc[k] === 'string') {
        const v = safeParse(doc[k]);
        if (v !== undefined) {
          setFromCloudForm(k, v);
          cloud.known[k] = doc[k];
        }
      }
    });
    persistCloudBookkeeping();
    saveState(false);
    if (cloud.onRemoteRender) cloud.onRemoteRender();
    if (cloud.onToast) cloud.onToast('Datos traídos desde la nube');
  } catch (e) {
    if (cloud.onToast) cloud.onToast('No se pudo conectar con la URL indicada');
  }
}
