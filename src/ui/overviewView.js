// ============================================================================
// CAPA DE UI: Pantalla 1 (Anotador de Tandas, Gráfico Semanal y Movimientos)
// Responsabilidad única: Renderizar y gestionar el armador de tandas de venta,
// el gráfico semanal de ventas vs meta y la barra rápida de WhatsApp + tabla.
// ============================================================================

import { formatARS, getOffsetDateISO, getCurrentTimeHHMM } from '../domain/formatters.js';
import { calculateProductCost } from '../domain/costing.js';
import { isDateInPeriod } from '../domain/ledger.js';
import { classifyExpenseText } from '../domain/classifier.js';
import { store, saveState, getIngredientById } from '../data/store.js';
import { showToast } from './toast.js';

export function renderOverviewRightColumn() {
  const { state, activeCatFilter, draftCart } = store;
  const grid = document.getElementById('productCounterGrid');
  grid.innerHTML = '';

  const prods = state.products.filter(p => {
    if (activeCatFilter === 'all') return true;
    if (activeCatFilter === 'Comida') {
      return p.category === 'Pizzas' || p.category === 'Minutas' || p.id === 'prod_coca_175';
    }
    return p.category === activeCatFilter;
  });

  prods.forEach(prod => {
    const unitCost = calculateProductCost(prod, state.ingredients);
    const unitProfit = prod.price - unitCost;
    const qty = draftCart[prod.id] || 0;

    const row = document.createElement('div');
    row.className = `prod-counter-row ${qty > 0 ? 'active-row' : ''}`;
    row.innerHTML = `
      <div class="prod-info-col" data-tap-row="${prod.id}">
        <div class="prod-title-line">${prod.name}</div>
        <div class="prod-meta-line">${formatARS(prod.price)} · Limpio +${formatARS(unitProfit)}</div>
      </div>
      <div class="stepper-group">
        <button type="button" class="step-btn" data-step-minus="${prod.id}" aria-label="Restar ${prod.name}">\u2212</button>
        <span class="step-qty num">${qty}</span>
        <button type="button" class="step-btn" data-step-plus="${prod.id}" aria-label="Sumar ${prod.name}">+</button>
      </div>
    `;
    grid.appendChild(row);
  });

  updateDraftBar();
  renderWeeklyChart();
  renderTodayMovementsTable();
}

export function updateDraftBar() {
  const { state, draftCart } = store;
  const entries = Object.entries(draftCart).filter(([, q]) => q > 0);
  let totalItems = 0;
  let totalSale = 0;
  let totalCost = 0;

  entries.forEach(([prodId, qty]) => {
    const prod = state.products.find(p => p.id === prodId);
    if (!prod) return;
    const c = calculateProductCost(prod, state.ingredients);
    totalItems += qty;
    totalSale += prod.price * qty;
    totalCost += c * qty;
  });

  document.getElementById('draftCountLabel').textContent = `${totalItems} u.`;
  document.getElementById('draftSaleSum').textContent = formatARS(totalSale);
  document.getElementById('draftCostSum').textContent = formatARS(totalCost);
  document.getElementById('draftProfitSum').textContent = formatARS(totalSale - totalCost);

  const hasItems = totalItems > 0;
  document.getElementById('btnResetDraft').disabled = !hasItems;
  document.getElementById('btnSaveTanda').disabled = !hasItems;
}

export function renderWeeklyChart() {
  const chartEl = document.getElementById('weeklySalesChart');
  if (!chartEl || !window.Charts) return;

  const { state } = store;
  const byDate = {};
  state.sales.forEach(s => {
    byDate[s.date] = (byDate[s.date] || 0) + (Number(s.totalSale) || 0);
  });

  const sortedDates = Object.keys(byDate).sort();
  const last7Dates = sortedDates.slice(-7);

  const labels = [];
  const valuesInThousands = [];
  let sumWeek = 0;
  let daysOverGoal = 0;

  if (last7Dates.length > 0) {
    last7Dates.forEach(iso => {
      const daySales = byDate[iso] || 0;
      sumWeek += daySales;
      if (daySales >= state.meta.dailySalesGoal) daysOverGoal += 1;
      const shortDate = iso.slice(8, 10) + '/' + iso.slice(5, 7);
      labels.push(shortDate);
      valuesInThousands.push(Math.round(daySales / 1000));
    });
  } else {
    for (let i = 6; i >= 0; i--) {
      const iso = getOffsetDateISO(i);
      labels.push(iso.slice(8, 10) + '/' + iso.slice(5, 7));
      valuesInThousands.push(0);
    }
  }

  const divisor = Math.max(1, last7Dates.length);
  const avgEl = document.getElementById('weeklyAvgFooter');
  if (avgEl) avgEl.textContent = formatARS(Math.round(sumWeek / divisor));
  const sumEl = document.getElementById('weeklySumFooter');
  if (sumEl) sumEl.textContent = formatARS(sumWeek);
  const goalDaysEl = document.getElementById('weeklyGoalDaysFooter');
  if (goalDaysEl) goalDaysEl.textContent = `${daysOverGoal} de ${divisor} días`;

  window.Charts.bars(chartEl, {
    labels,
    values: valuesInThousands,
    highlight: Math.max(0, labels.length - 1),
    height: 310,
    reference: { value: 100, label: 'Meta $100k' },
    format: v => `$${v}k`,
    tickFormat: v => `$${v}k`
  });
}

export function renderTodayMovementsTable() {
  const { state, currentPeriod, activeDate } = store;
  const tbody = document.getElementById('todayMovementsTableBody');
  tbody.innerHTML = '';

  const salesFiltered = state.sales
    .filter(s => isDateInPeriod(s.date, currentPeriod, activeDate))
    .map(s => ({ ...s, _kind: 'sale' }));
  const expFiltered = state.expenses
    .filter(e => isDateInPeriod(e.date, currentPeriod, activeDate))
    .map(e => ({ ...e, _kind: 'expense' }));

  const combined = [...salesFiltered, ...expFiltered].sort((a, b) => {
    const cmpDate = (b.date || '').localeCompare(a.date || '');
    if (cmpDate !== 0) return cmpDate;
    return (b.time || '').localeCompare(a.time || '');
  });

  const countEl = document.getElementById('todayMovementsCount');
  if (countEl) {
    countEl.textContent = `${combined.length} registro${combined.length === 1 ? '' : 's'}`;
  }

  if (combined.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; color:var(--muted); padding:20px;">
          Sin movimientos en el período seleccionado (${activeDate}). Cambiá a "Mes Octubre" arriba o anotá una tanda/salida.
        </td>
      </tr>
    `;
    return;
  }

  combined.forEach(row => {
    const tr = document.createElement('tr');
    const shortDate = row.date ? `${row.date.slice(8, 10)}/${row.date.slice(5, 7)}` : '';
    if (row._kind === 'sale') {
      const itemsText = (row.items || []).map(i => `${i.qty}x ${i.name}`).join(', ');
      tr.innerHTML = `
        <td class="num">
          ${shortDate} · ${row.time}
          <span class="sub">${row.operator}</span>
        </td>
        <td>
          <span class="pill pos">Ingreso</span>
          <span style="margin-left:6px; font-weight:500;">${itemsText}</span>
          ${row.note ? `<span class="sub">${row.note}</span>` : ''}
        </td>
        <td class="n num hide-mobile">${formatARS(row.totalCost)}</td>
        <td class="n money-bold num" style="color:var(--positive);">+${formatARS(row.totalSale)}</td>
        <td class="n">
          <button type="button" class="btn btn-sm" data-del-sale="${row.id}">Borrar</button>
        </td>
      `;
    } else {
      tr.innerHTML = `
        <td class="num">
          ${shortDate} · ${row.time}
          <span class="sub">${row.operator}</span>
        </td>
        <td>
          <span class="pill">${row.category}</span>
          <span style="margin-left:6px;">${row.description}</span>
        </td>
        <td class="n num hide-mobile">\u2014</td>
        <td class="n money-bold num">${formatARS(-row.amount)}</td>
        <td class="n">
          <button type="button" class="btn btn-sm" data-del-exp="${row.id}">Borrar</button>
        </td>
      `;
    }
    tbody.appendChild(tr);
  });
}

export function bindOverviewEvents({ onRenderAll }) {
  document.querySelectorAll('.cat-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      store.activeCatFilter = btn.dataset.cat;
      document.querySelectorAll('.cat-filter-btn').forEach(b => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      renderOverviewRightColumn();
    });
  });

  document.getElementById('productCounterGrid').addEventListener('click', e => {
    const rowTap = e.target.closest('[data-tap-row]');
    const plusBtn = e.target.closest('[data-step-plus]');
    const minusBtn = e.target.closest('[data-step-minus]');

    if (rowTap || plusBtn) {
      const id = (rowTap || plusBtn).dataset.tapRow || (rowTap || plusBtn).dataset.stepPlus;
      store.draftCart[id] = (store.draftCart[id] || 0) + 1;
      renderOverviewRightColumn();
    } else if (minusBtn) {
      const id = minusBtn.dataset.stepMinus;
      if ((store.draftCart[id] || 0) > 0) {
        store.draftCart[id] -= 1;
        if (store.draftCart[id] <= 0) delete store.draftCart[id];
        renderOverviewRightColumn();
      }
    }
  });

  document.getElementById('btnResetDraft').addEventListener('click', () => {
    store.draftCart = {};
    renderOverviewRightColumn();
  });

  document.getElementById('btnSaveTanda').addEventListener('click', () => {
    const entries = Object.entries(store.draftCart).filter(([, q]) => q > 0);
    if (!entries.length) return;

    let totalSale = 0;
    let totalCost = 0;
    const items = [];

    entries.forEach(([prodId, qty]) => {
      const prod = store.state.products.find(p => p.id === prodId);
      if (!prod) return;
      const unitCost = calculateProductCost(prod, store.state.ingredients);
      totalSale += prod.price * qty;
      totalCost += unitCost * qty;
      items.push({
        prodId: prod.id,
        name: prod.name,
        qty,
        unitPrice: prod.price,
        unitCost
      });
    });

    const noteEl = document.getElementById('draftNoteInput');
    store.state.sales.push({
      id: 'sale_' + Date.now(),
      date: store.activeDate,
      time: getCurrentTimeHHMM(),
      operator: store.currentOperator,
      note: noteEl.value.trim(),
      totalSale,
      totalCost,
      items
    });

    store.draftCart = {};
    noteEl.value = '';
    saveState();
    onRenderAll();
    showToast(`Tanda registrada por ${formatARS(totalSale)}`);
  });

  document.getElementById('todayMovementsTableBody').addEventListener('click', e => {
    const delSale = e.target.closest('[data-del-sale]');
    const delExp = e.target.closest('[data-del-exp]');
    if (delSale) {
      store.state.sales = store.state.sales.filter(s => s.id !== delSale.dataset.delSale);
      saveState();
      onRenderAll();
      showToast('Tanda eliminada');
    } else if (delExp) {
      store.state.expenses = store.state.expenses.filter(x => x.id !== delExp.dataset.delExp);
      saveState();
      onRenderAll();
      showToast('Egreso eliminado');
    }
  });

  const quickSmartInput = document.getElementById('inputQuickSmartExpense');
  const smartPreviewBadge = document.getElementById('smartPreviewBadge');
  if (quickSmartInput && smartPreviewBadge) {
    quickSmartInput.addEventListener('input', () => {
      const val = quickSmartInput.value.trim();
      if (!val) {
        smartPreviewBadge.textContent = 'Auto-clasificador activo';
        smartPreviewBadge.className = 'pill';
        return;
      }
      const parsed = classifyExpenseText(val);
      const amtText = parsed.amount > 0 ? ` · ${formatARS(parsed.amount)}` : ' · (falta monto)';
      const ingText =
        parsed.ingId && parsed.newUnitPrice > 0
          ? ` · Costo: ${formatARS(parsed.newUnitPrice)}/u`
          : '';
      smartPreviewBadge.textContent = `${parsed.category}${amtText}${ingText}`;
      smartPreviewBadge.className = parsed.amount > 0 ? 'pill pos' : 'pill warn';
    });

    quickSmartInput.addEventListener('paste', e => {
      const clipText = (e.clipboardData || window.clipboardData)?.getData('text') || '';
      if (clipText.includes('\n')) {
        e.preventDefault();
        const lines = clipText
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(Boolean);
        let addedCount = 0;
        let totalAddedARS = 0;
        lines.forEach((line, idx) => {
          const parsed = classifyExpenseText(line);
          if (parsed.amount > 0) {
            if (parsed.ingId && parsed.detectedQty > 0) {
              const ing = getIngredientById(parsed.ingId);
              if (ing) ing.price = Math.round(parsed.amount / parsed.detectedQty);
            }
            store.state.expenses.push({
              id: 'exp_' + Date.now() + '_' + idx,
              date: store.activeDate,
              time: getCurrentTimeHHMM(),
              operator: store.currentOperator,
              category: parsed.category,
              description: parsed.cleanDesc || line,
              amount: parsed.amount
            });
            addedCount++;
            totalAddedARS += parsed.amount;
          }
        });
        if (addedCount > 0) {
          quickSmartInput.value = '';
          smartPreviewBadge.textContent = 'Auto-clasificador activo';
          smartPreviewBadge.className = 'pill';
          saveState();
          onRenderAll();
          showToast(`${addedCount} egresos de WhatsApp cargados (${formatARS(totalAddedARS)})`);
        } else {
          quickSmartInput.value = lines.join(' · ');
        }
      }
    });
  }

  const formQuickSmart = document.getElementById('formQuickSmartExpense');
  if (formQuickSmart) {
    formQuickSmart.addEventListener('submit', e => {
      e.preventDefault();
      const raw = quickSmartInput.value.trim();
      if (!raw) return;

      const parsed = classifyExpenseText(raw);
      let finalAmount = parsed.amount;
      if (finalAmount <= 0) {
        const prompted = Number(prompt(`¿Qué monto ($) salió para "${parsed.cleanDesc || raw}"?`, ''));
        if (prompted > 0) finalAmount = Math.round(prompted);
      }
      if (finalAmount <= 0) return;

      if (parsed.ingId && parsed.detectedQty > 0) {
        const ing = getIngredientById(parsed.ingId);
        if (ing) {
          ing.price = Math.round(finalAmount / parsed.detectedQty);
        }
      }

      store.state.expenses.push({
        id: 'exp_' + Date.now(),
        date: store.activeDate,
        time: getCurrentTimeHHMM(),
        operator: store.currentOperator,
        category: parsed.category,
        description: parsed.cleanDesc || raw,
        amount: finalAmount
      });

      quickSmartInput.value = '';
      if (smartPreviewBadge) {
        smartPreviewBadge.textContent = 'Auto-clasificador activo';
        smartPreviewBadge.className = 'pill';
      }
      saveState();
      onRenderAll();
      showToast(`Clasificado en ${parsed.category}: ${formatARS(finalAmount)}`);
    });
  }
}
