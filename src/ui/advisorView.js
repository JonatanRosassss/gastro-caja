// ============================================================================
// CAPA DE UI: Pantalla 5 (Consultor Financiero IA y Simulador de Cuotas)
// Responsabilidad única: Renderizar el simulador de inversión/cuota, las
// estadísticas automáticas y el chat con Gemini IA o motor local.
// ============================================================================

import { formatARS, formatMarkdownToHtml } from '../domain/formatters.js';
import { calculateProductCost, getProductMarginPercent } from '../domain/costing.js';
import { getMetricsForPeriod, evaluateCreditQuota, buildLocalAdvisorReply } from '../domain/ledger.js';
import { store, saveState } from '../data/store.js';
import {
  discoverAvailableGeminiModels,
  queryGeminiAdvisor,
  clearDiscoveredModelsCache
} from '../data/geminiClient.js';
import { showToast } from './toast.js';

function populateDiscoveredModelOptions(candidates) {
  const sel = document.getElementById('selectGeminiModel');
  if (!sel || !Array.isArray(candidates) || !candidates.length) return;
  const existingValues = new Set(Array.from(sel.options).map(o => o.value));
  const customOpt = sel.querySelector('option[value="custom"]');
  candidates.slice(0, 8).forEach(modId => {
    if (!existingValues.has(modId)) {
      const opt = document.createElement('option');
      opt.value = modId;
      opt.textContent = `${modId} (Detectado en tu cuenta)`;
      sel.insertBefore(opt, customOpt || null);
      existingValues.add(modId);
    }
  });
}

export function renderAdvisorScreen() {
  const { state, activeDate } = store;
  const monthM = getMetricsForPeriod(state, 'month', activeDate);
  const ranked = [...state.products].sort(
    (a, b) =>
      getProductMarginPercent(b, state.ingredients) - getProductMarginPercent(a, state.ingredients)
  );
  const best = ranked[0];
  const lowest = ranked[ranked.length - 1];

  const geminiBadge = document.getElementById('geminiStatusBadge');
  const geminiBtn = document.getElementById('btnSetGeminiKey');
  const modelSelect = document.getElementById('selectGeminiModel');
  const hasKey = Boolean(state.meta.geminiApiKey && state.meta.geminiApiKey.trim());

  if (modelSelect) {
    const savedMod = state.meta.geminiModel || 'auto';
    if (!Array.from(modelSelect.options).some(o => o.value === savedMod)) {
      const opt = document.createElement('option');
      opt.value = savedMod;
      opt.textContent = savedMod;
      modelSelect.insertBefore(opt, modelSelect.querySelector('option[value="custom"]'));
    }
    modelSelect.value = savedMod;
  }

  if (geminiBadge) {
    const modLabel =
      !state.meta.geminiModel || state.meta.geminiModel === 'auto'
        ? 'Auto Flash'
        : state.meta.geminiModel;
    geminiBadge.textContent = hasKey ? `Gemini IA: Conectado (${modLabel})` : 'Modo local (Sin API Key)';
    geminiBadge.className = hasKey ? 'pill pos' : 'pill';
  }
  if (geminiBtn) {
    geminiBtn.textContent = hasKey ? 'Cambiar API Gemini' : 'Configurar API Gemini';
  }

  const rowsEl = document.getElementById('autoInsightsRows');
  rowsEl.innerHTML = `
    <div class="row">
      <div>
        <div style="font-weight:500;">Disponible neto acumulado de Octubre</div>
        <div class="meta">Descontando ${formatARS(monthM.cogsSold)} de reposición y ${formatARS(monthM.operatingExpenses)} de salidas</div>
      </div>
      <div class="money-bold num">${formatARS(monthM.netFreeProfit)}</div>
    </div>
    <div class="row">
      <div>
        <div style="font-weight:500;">Mayor margen porcentual hoy</div>
        <div class="meta">${best ? best.name : '-'} (Costo ${best ? formatARS(calculateProductCost(best, state.ingredients)) : '$0'})</div>
      </div>
      <span class="pill pos num">${best ? getProductMarginPercent(best, state.ingredients) : 0}%</span>
    </div>
    <div class="row">
      <div>
        <div style="font-weight:500;">Margen más ajustado a vigilar</div>
        <div class="meta">${lowest ? lowest.name : '-'} (Costo ${lowest ? formatARS(calculateProductCost(lowest, state.ingredients)) : '$0'})</div>
      </div>
      <span class="pill warn num">${lowest ? getProductMarginPercent(lowest, state.ingredients) : 0}%</span>
    </div>
  `;

  updateCreditVerdict();
}

export function updateCreditVerdict() {
  const quota = Number(document.getElementById('inputSimQuota').value) || 0;
  const monthM = getMetricsForPeriod(store.state, 'month', store.activeDate);
  const { isSafe, safeThreshold, estimatedMonthlyNet } = evaluateCreditQuota(quota, monthM);

  const box = document.getElementById('simVerdictBox');
  if (isSafe) {
    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <strong>Cuota saludable</strong>
        <span class="pill pos num">Hasta ${formatARS(safeThreshold)}/mes seguro</span>
      </div>
      <p class="meta">
        La cuota de ${formatARS(quota)} consume menos del 25% de tu margen operativo mensual (~${formatARS(
      estimatedMonthlyNet
    )}). Podés afrontarla sin tocar el fondo de reposición de mercadería.
      </p>
    `;
  } else {
    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <strong>Compromiso exigente</strong>
        <span class="pill warn num">Supera ${formatARS(safeThreshold)}/mes</span>
      </div>
      <p class="meta">
        Una cuota de ${formatARS(quota)} exige más del 25% de tu margen operativo mensual (~${formatARS(
      estimatedMonthlyNet
    )}). Solo se recomienda si el equipamiento reduce costos de insumos o aumenta las tandas por noche.
      </p>
    `;
  }
}

export async function askAdvisor(question, forceLocal = false) {
  const log = document.getElementById('advisorChatLog');
  const { state, activeDate } = store;

  const uDiv = document.createElement('div');
  uDiv.className = 'chat-entry user';
  uDiv.textContent = question;
  log.appendChild(uDiv);

  const aDiv = document.createElement('div');
  aDiv.className = 'chat-entry assistant';
  const rawKey = (state.meta.geminiApiKey || '').trim().replace(/^["']|["']$/g, '');
  aDiv.textContent =
    rawKey && !forceLocal
      ? 'Conectando con Google Gemini IA...'
      : 'Calculando sobre tus registros locales...';
  log.appendChild(aDiv);
  log.scrollTop = log.scrollHeight;

  const monthM = getMetricsForPeriod(state, 'month', activeDate);
  let geminiErrorNotice = '';

  if (rawKey && !forceLocal) {
    const result = await queryGeminiAdvisor({
      rawKey,
      preferredModel: state.meta.geminiModel || 'auto',
      question,
      state,
      monthM,
      onModelTry: (modelName, discovered) => {
        populateDiscoveredModelOptions(discovered);
        aDiv.textContent = `Consultando a ${modelName}...`;
      }
    });

    if (result.ok) {
      aDiv.innerHTML =
        `<div style="margin-bottom:6px; display:flex; align-items:center; gap:6px;">` +
        `<span class="pill pos">Gemini IA (${result.modelName})</span>` +
        `</div>` +
        formatMarkdownToHtml(result.reply);
      log.scrollTop = log.scrollHeight;
      return;
    }
    geminiErrorNotice = result.errorNotice || '';
  }

  const prefixBadge =
    rawKey && !forceLocal
      ? `<div style="margin-bottom:6px;"><span class="pill warn">Aviso Gemini (${
          geminiErrorNotice || 'Verificá tu API Key'
        }) · Respuesta calculada localmente:</span></div>`
      : rawKey && forceLocal
      ? `<div style="margin-bottom:6px;"><span class="pill pos">Resumen rápido inicial · Tocá cualquier botón de arriba o escribí abajo para consultar a Gemini IA en vivo</span></div>`
      : `<div style="margin-bottom:6px;"><span class="pill">Motor local (Configurá tu API Gemini arriba para respuestas abiertas con IA)</span></div>`;

  aDiv.innerHTML = buildLocalAdvisorReply(question, state, monthM, prefixBadge);
  log.scrollTop = log.scrollHeight;
}

export async function initAdvisorModelsDiscovery() {
  const rawKey = (store.state.meta.geminiApiKey || '').trim().replace(/^["']|["']$/g, '');
  if (!rawKey) return;
  const candidates = await discoverAvailableGeminiModels(rawKey);
  populateDiscoveredModelOptions(candidates);
  renderAdvisorScreen();
}

export function bindAdvisorEvents() {
  document.getElementById('inputSimQuota').addEventListener('input', updateCreditVerdict);
  document.querySelectorAll('.quick-ai-btn').forEach(btn => {
    btn.addEventListener('click', () => askAdvisor(btn.dataset.q));
  });
  document.getElementById('formAdvisorChat').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('inputAdvisorQuestion');
    if (!input.value.trim()) return;
    askAdvisor(input.value.trim());
    input.value = '';
  });

  const modelSel = document.getElementById('selectGeminiModel');
  if (modelSel) {
    modelSel.addEventListener('change', () => {
      if (modelSel.value === 'custom') {
        const customId = prompt(
          'Escribí el ID del modelo de Gemini (ej: gemini-3.8-flash, gemini-3.7-flash, gemini-3.5-pro):',
          'gemini-3.8-flash'
        );
        if (customId && customId.trim()) {
          const cleanMod = customId.trim().replace(/^models\//, '');
          store.state.meta.geminiModel = cleanMod;
        } else {
          store.state.meta.geminiModel = 'auto';
        }
      } else {
        store.state.meta.geminiModel = modelSel.value;
      }
      saveState();
      renderAdvisorScreen();
      showToast(`Modelo Gemini seleccionado: ${store.state.meta.geminiModel}`);
    });
  }

  document.getElementById('btnSetGeminiKey').addEventListener('click', async () => {
    const k = prompt(
      'Pegá tu API Key de Google Gemini (de Google AI Studio, empieza con AIza...):',
      store.state.meta.geminiApiKey || ''
    );
    if (k !== null) {
      store.state.meta.geminiApiKey = k.trim().replace(/^["']|["']$/g, '');
      clearDiscoveredModelsCache();
      saveState();
      if (store.state.meta.geminiApiKey) {
        const candidates = await discoverAvailableGeminiModels(store.state.meta.geminiApiKey);
        populateDiscoveredModelOptions(candidates);
      }
      renderAdvisorScreen();
      if (store.state.meta.geminiApiKey) {
        showToast('API Key guardada · Probando conexión con Gemini IA...');
        askAdvisor(
          'Haceme un diagnóstico rápido de nuestro mes de Octubre y decime un consejo concreto para mejorar nuestra ganancia libre.'
        );
      } else {
        showToast('Motor local activo (sin API Key)');
      }
    }
  });
}
