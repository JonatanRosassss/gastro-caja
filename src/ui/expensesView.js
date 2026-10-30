// ============================================================================
// CAPA DE UI: Pantalla 2 (Gastos, Compromisos Iglesia y Distribución Mensual)
// Responsabilidad única: Renderizar el formulario detallado de gastos con
// deducción automática y los gráficos de metas y distribución por categoría.
// ============================================================================

import { formatARS, getCurrentTimeHHMM } from '../domain/formatters.js';
import { getMetricsForPeriod } from '../domain/ledger.js';
import { classifyExpenseText } from '../domain/classifier.js';
import { store, saveState, getIngredientById } from '../data/store.js';
import { showToast } from './toast.js';

export function renderExpensesScreen() {
  const { state, activeDate } = store;
  const select = document.getElementById('expIngSelect');
  const prev = select.value;
  select.innerHTML = `<option value="">Sin cambios en costos unitarios</option>`;
  state.ingredients.forEach(ing => {
    const opt = document.createElement('option');
    opt.value = ing.id;
    opt.textContent = `${ing.name} (${formatARS(ing.price)} x ${ing.unit})`;
    select.appendChild(opt);
  });
  select.value = prev;

  const monthM = getMetricsForPeriod(state, 'month', activeDate);
  const rentPaid = monthM.expensesInPeriod
    .filter(e => e.category === 'Alquiler')
    .reduce((s, e) => s + Math.round(Number(e.amount) || 0), 0);
  const lightDirect = monthM.expensesInPeriod
    .filter(e => e.category === 'Luz')
    .reduce((s, e) => s + Math.round(Number(e.amount) || 0), 0);
  const churchOfferings = monthM.expensesInPeriod
    .filter(e => e.category === 'Ofrenda Iglesia (Luz/Alquiler)')
    .reduce((s, e) => s + Math.round(Number(e.amount) || 0), 0);

  const planEl = document.getElementById('churchPlanChart');
  if (planEl && window.Charts) {
    window.Charts.plan(
      planEl,
      [
        {
          label: `Alquiler (Meta ${formatARS(state.meta.rentMyGoal)} de $800k)`,
          planned: state.meta.rentMyGoal,
          spent: rentPaid
        },
        {
          label: `Luz + Ofrendas (Meta ${formatARS(state.meta.lightMyGoal)} de $270k)`,
          planned: state.meta.lightMyGoal,
          spent: lightDirect,
          committed: churchOfferings
        }
      ],
      {
        scale: 'row',
        format: v => formatARS(v)
      }
    );
  }

  const catMap = {};
  monthM.expensesInPeriod.forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + Math.round(Number(e.amount) || 0);
  });
  const catRows = Object.entries(catMap)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const barListEl = document.getElementById('categoryBarListChart');
  if (barListEl && window.Charts) {
    if (catRows.length > 0) {
      window.Charts.barList(barListEl, catRows, { format: v => formatARS(v) });
    } else {
      barListEl.innerHTML = `<div class="empty">Sin egresos registrados en este mes.</div>`;
    }
  }
}

export function bindExpensesEvents({ onRenderAll }) {
  const expDescInput = document.getElementById('expDesc');
  const expCatSelect = document.getElementById('expCategory');
  const expAmountInput = document.getElementById('expAmount');
  const expIngSelect = document.getElementById('expIngSelect');
  const expNewUnitInput = document.getElementById('expNewUnitPrice');
  const formAutoBadge = document.getElementById('formAutoCatBadge');

  if (expDescInput) {
    expDescInput.addEventListener('input', () => {
      const raw = expDescInput.value.trim();
      if (!raw) {
        if (formAutoBadge) {
          formAutoBadge.textContent = 'Se deduce al escribir';
          formAutoBadge.className = 'pill';
        }
        return;
      }
      const parsed = classifyExpenseText(raw);
      if (parsed.matchedRule && expCatSelect) {
        expCatSelect.value = parsed.category;
        if (formAutoBadge) {
          formAutoBadge.textContent = `Auto: ${parsed.category}`;
          formAutoBadge.className = 'pill pos';
        }
      }
      if (parsed.amount > 0 && expAmountInput && !expAmountInput.value) {
        expAmountInput.value = parsed.amount;
      }
      if (parsed.ingId && expIngSelect) {
        expIngSelect.value = parsed.ingId;
        const currentAmt = Number(expAmountInput?.value) || parsed.amount;
        if (parsed.detectedQty > 0 && currentAmt > 0 && expNewUnitInput) {
          expNewUnitInput.value = Math.round(currentAmt / parsed.detectedQty);
        }
      }
    });
  }

  document.getElementById('formNewExpense').addEventListener('submit', e => {
    e.preventDefault();
    const rawDesc = document.getElementById('expDesc').value.trim();
    const parsed = classifyExpenseText(rawDesc);
    const category = document.getElementById('expCategory').value || parsed.category;
    const amount = Math.round(Number(document.getElementById('expAmount').value) || parsed.amount || 0);
    const description = parsed.cleanDesc || rawDesc;
    const ingId = document.getElementById('expIngSelect').value || parsed.ingId;
    const newUnitPrice = Number(document.getElementById('expNewUnitPrice').value) || parsed.newUnitPrice || 0;

    if (amount <= 0 || !description) return;

    if (ingId && newUnitPrice > 0) {
      const ing = getIngredientById(ingId);
      if (ing) ing.price = newUnitPrice;
    }

    store.state.expenses.push({
      id: 'exp_' + Date.now(),
      date: store.activeDate,
      time: getCurrentTimeHHMM(),
      operator: store.currentOperator,
      category,
      description,
      amount
    });

    document.getElementById('expAmount').value = '';
    document.getElementById('expDesc').value = '';
    document.getElementById('expIngSelect').value = '';
    document.getElementById('expNewUnitPrice').value = '';
    if (formAutoBadge) {
      formAutoBadge.textContent = 'Se deduce al escribir';
      formAutoBadge.className = 'pill';
    }

    saveState();
    onRenderAll();
    showToast(`Gasto guardado en ${category}`);
  });

  document.querySelectorAll('[data-quick-exp]').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.quickExp;
      const amount = Number(btn.dataset.amount) || 0;
      store.state.expenses.push({
        id: 'exp_' + Date.now(),
        date: store.activeDate,
        time: getCurrentTimeHHMM(),
        operator: store.currentOperator,
        category,
        description: `${category} (registro rápido)`,
        amount
      });
      saveState();
      onRenderAll();
      showToast(`Registrado: ${formatARS(amount)} en ${category}`);
    });
  });

  document.getElementById('btnEditChurchTargets').addEventListener('click', () => {
    const r = prompt('Meta mensual de aporte de Alquiler ($):', store.state.meta.rentMyGoal);
    if (r !== null && !isNaN(Number(r))) store.state.meta.rentMyGoal = Number(r);
    const l = prompt('Meta mensual de aporte de Luz y Ofrendas ($):', store.state.meta.lightMyGoal);
    if (l !== null && !isNaN(Number(l))) store.state.meta.lightMyGoal = Number(l);
    saveState();
    onRenderAll();
  });
}
