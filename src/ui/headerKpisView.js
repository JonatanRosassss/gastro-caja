// ============================================================================
// CAPA DE UI: Banda de 4 KPIs, Árbol de Bolsillos y Calculadora de Heber
// Responsabilidad única: Renderizar los indicadores principales, el árbol
// contable de los 3 bolsillos y liquidar turnos de Heber.
// ============================================================================

import { formatARS, formatSignedARS, getCurrentTimeHHMM } from '../domain/formatters.js';
import { getMetricsForPeriod } from '../domain/ledger.js';
import { store, saveState } from '../data/store.js';
import { showToast } from './toast.js';

export function renderHeaderAndKpis() {
  const { state, currentPeriod, activeDate, severHours, severSelectedRate } = store;
  const m = getMetricsForPeriod(state, currentPeriod, activeDate);
  const todayM = getMetricsForPeriod(state, 'today', activeDate);

  const periodNames = {
    today: `Fecha ${activeDate}`,
    week: `Últimos 7 días hasta ${activeDate}`,
    month: `Mes Octubre (${activeDate.slice(0, 7)})`
  };

  document.getElementById('ledgerPeriodLabel').textContent = periodNames[currentPeriod];

  if (currentPeriod === 'month') {
    document.getElementById('screenFinding').textContent =
      `En ${activeDate.slice(0, 7)} llevás ${formatARS(m.grossSales)} vendidos en ${m.tandasCount} cierres/tandas, con ${formatARS(
        m.cogsSold
      )} de reposición de mercadería y ${formatARS(m.netFreeProfit)} de saldo neto tras gastos, Heber, garrafas, equipamiento y casa.`;
  } else {
    const goalDiff = todayM.grossSales - state.meta.dailySalesGoal;
    const goalPhrase =
      goalDiff >= 0
        ? `superaste la meta diaria de $100.000 por ${formatSignedARS(goalDiff)}`
        : `faltan ${formatARS(Math.abs(goalDiff))} para alcanzar la meta diaria de $100.000`;

    document.getElementById('screenFinding').textContent =
      `En la fecha ${activeDate} llevás ${formatARS(todayM.grossSales)} vendidos en ${todayM.tandasCount} tanda${
        todayM.tandasCount === 1 ? '' : 's'
      } (${goalPhrase}), con ${formatARS(todayM.netFreeProfit)} de ganancia libre tras separar reposición, gastos y casa.`;
  }

  document.getElementById('kpiNetFree').textContent = formatARS(m.netFreeProfit);
  const marginPct = m.grossSales > 0 ? Math.round((m.netFreeProfit / m.grossSales) * 100) : 0;
  document.getElementById('kpiNetDelta').innerHTML =
    m.grossSales > 0
      ? `<span class="${m.netFreeProfit >= 0 ? 'up' : 'down'}">${marginPct}%</span> libre en caja sobre venta bruta`
      : `Sin ventas registradas en este período`;

  document.getElementById('kpiGrossSales').textContent = formatARS(m.grossSales);
  const targetForPeriod =
    currentPeriod === 'today'
      ? state.meta.dailySalesGoal
      : currentPeriod === 'week'
      ? state.meta.dailySalesGoal * 5
      : 1800000;
  const vsTarget = m.grossSales - targetForPeriod;
  document.getElementById('kpiGrossDelta').innerHTML =
    `<span class="${vsTarget >= 0 ? 'up' : ''}">${formatSignedARS(vsTarget)}</span> frente a referencia de ${formatARS(targetForPeriod)}`;

  document.getElementById('kpiReplenishment').textContent = formatARS(m.cogsSold);
  document.getElementById('kpiReplenishmentDelta').textContent =
    `Compras reales de insumos en período: ${formatARS(m.stockPurchases)}`;

  document.getElementById('kpiOperatingExp').textContent = formatARS(m.operatingExpenses);
  document.getElementById('kpiOperatingDelta').textContent =
    m.familySupport > 0
      ? `Incluye ${formatARS(m.familySupport)} para Casa y Familia (Mami/Papá)`
      : `Heber, garrafas, ofrenda, local y retiros`;

  const monthM = getMetricsForPeriod(state, 'month', activeDate);
  const lightOfferingsMonth = monthM.expensesInPeriod
    .filter(e => e.category === 'Luz' || e.category === 'Ofrenda Iglesia (Luz/Alquiler)' || e.category === 'Alquiler')
    .reduce((s, e) => s + Math.round(Number(e.amount) || 0), 0);
  const heberPaidMonth = monthM.expensesInPeriod
    .filter(e => e.category === 'Pago a Heber' || e.category === 'Pago a Sever')
    .reduce((s, e) => s + Math.round(Number(e.amount) || 0), 0);
  const gasMonth = monthM.expensesInPeriod
    .filter(e => e.category === 'Garrafa / Gas')
    .reduce((s, e) => s + Math.round(Number(e.amount) || 0), 0);
  const familyMonth = monthM.expensesInPeriod
    .filter(e => e.category === 'Casa y Familia (Papá)')
    .reduce((s, e) => s + Math.round(Number(e.amount) || 0), 0);
  const equipMonth = monthM.expensesInPeriod
    .filter(e => e.category === 'Equipamiento y Local')
    .reduce((s, e) => s + Math.round(Number(e.amount) || 0), 0);

  const treeEl = document.getElementById('ledgerTreeContainer');
  treeEl.innerHTML = `
    <div class="ledger-group">
      <div class="ledger-group-head">
        <span>Cuentas (${periodNames[currentPeriod]})</span>
        <span class="money-bold num">${formatARS(m.netFreeProfit)}</span>
      </div>
      <div class="ledger-leaf">
        <span>1. Caja bruta vendida</span>
        <strong>${formatARS(m.grossSales)}</strong>
      </div>
      <div class="ledger-leaf">
        <span>2. Costo reposición mercadería</span>
        <strong>\u2212${formatARS(m.cogsSold)}</strong>
      </div>
      <div class="ledger-leaf">
        <span>3. Salidas operativas, Casa y Retiros</span>
        <strong>\u2212${formatARS(m.operatingExpenses)}</strong>
      </div>
    </div>

    <div class="ledger-group">
      <div class="ledger-group-head">
        <span>Desglose Octubre (Casa, Heber, Gas y Local)</span>
        <span class="num">${formatARS(familyMonth + heberPaidMonth + gasMonth + lightOfferingsMonth + equipMonth)}</span>
      </div>
      <div class="ledger-leaf">
        <span>Casa y Familia (Mami / Papá)</span>
        <strong>${formatARS(familyMonth)}</strong>
      </div>
      <div class="ledger-leaf">
        <span>Turnos pagados a Heber</span>
        <strong>${formatARS(heberPaidMonth)}</strong>
      </div>
      <div class="ledger-leaf">
        <span>Garrafas de gas ($26.000 c/u)</span>
        <strong>${formatARS(gasMonth)}</strong>
      </div>
      <div class="ledger-leaf">
        <span>Ofrenda Iglesia / Luz / Alquiler</span>
        <strong>${formatARS(lightOfferingsMonth)}</strong>
      </div>
      <div class="ledger-leaf">
        <span>Freidora, heladera y mejoras local</span>
        <strong>${formatARS(equipMonth)}</strong>
      </div>
    </div>
  `;

  const dateObj = new Date(activeDate + 'T12:00:00');
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayIdx = dateObj.getDay();
  const isSeverDay = [0, 2, 5, 6].includes(dayIdx);

  const pillEl = document.getElementById('severDayStatusPill');
  pillEl.textContent = isSeverDay ? `${dayNames[dayIdx]} · Turno Heber` : `${dayNames[dayIdx]} · Opcional`;
  pillEl.className = `pill ${isSeverDay ? 'pos' : ''}`;

  let recRate = 3500;
  let recText = '';
  if (todayM.grossSales >= 120000) {
    recRate = 4500;
    recText = `Venta de la fecha: ${formatARS(todayM.grossSales)} (noche fuerte). Sugerido Heber: $15.000 a $18.000.`;
  } else if (todayM.grossSales >= 85000) {
    recRate = 4000;
    recText = `Venta de la fecha: ${formatARS(todayM.grossSales)} (buen movimiento). Sugerido Heber: $14.000 a $16.000.`;
  } else {
    recRate = 3500;
    recText = `En octubre le pagaste a Heber entre $12.000 y $15.000 por jornada (${formatARS(heberPaidMonth)} en el mes).`;
  }

  document.getElementById('severSuggestionCopy').textContent = recText;
  document.getElementById('severHoursDisplay').textContent = severHours;

  document.querySelectorAll('#severRatesBar .rate-btn').forEach(btn => {
    const r = Number(btn.dataset.rate);
    btn.classList.toggle('recommended', r === recRate);
    btn.setAttribute('aria-pressed', String(r === severSelectedRate));
  });

  document.getElementById('severTotalAmount').textContent = formatARS(severHours * severSelectedRate);
}

export function bindHeaderAndSeverEvents({ onRenderAll }) {
  document.getElementById('btnSeverMinus').addEventListener('click', () => {
    if (store.severHours > 1) {
      store.severHours -= 0.5;
      renderHeaderAndKpis();
    }
  });

  document.getElementById('btnSeverPlus').addEventListener('click', () => {
    store.severHours += 0.5;
    renderHeaderAndKpis();
  });

  document.querySelectorAll('#severRatesBar .rate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      store.severSelectedRate = Number(btn.dataset.rate);
      renderHeaderAndKpis();
    });
  });

  document.getElementById('btnCommitSeverPay').addEventListener('click', () => {
    const amount = Math.round(store.severHours * store.severSelectedRate);
    store.state.expenses.push({
      id: 'exp_' + Date.now(),
      date: store.activeDate,
      time: getCurrentTimeHHMM(),
      operator: store.currentOperator,
      category: 'Pago a Heber',
      description: `Turno Heber (${store.severHours} hs a ${formatARS(store.severSelectedRate)}/h)`,
      amount
    });
    saveState();
    onRenderAll();
    showToast(`Pago a Heber registrado: ${formatARS(amount)}`);
  });

  document.getElementById('btnCopyWhatsapp').addEventListener('click', () => {
    const m = getMetricsForPeriod(store.state, 'today', store.activeDate);
    const msg =
      `CIERRE DEL DIA (${store.activeDate})\n` +
      `- Vendido bruto: ${formatARS(m.grossSales)} (${m.tandasCount} tandas)\n` +
      `- Fondo reposicion mercaderia: ${formatARS(m.cogsSold)}\n` +
      `- Gastos del local y casa hoy: ${formatARS(m.operatingExpenses)}${
        m.familySupport > 0 ? ` (Casa/Mami: ${formatARS(m.familySupport)})` : ''
      }\n` +
      `- GANANCIA LIBRE HOY: ${formatARS(m.netFreeProfit)}`;
    navigator.clipboard.writeText(msg).then(() => {
      showToast('Resumen copiado al portapapeles');
    });
  });
}
