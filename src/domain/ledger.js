// ============================================================================
// CAPA DE DOMINIO: Modelo Contable "Los 3 Bolsillos" y Diagnóstico Financiero
// Responsabilidad única: Calcular métricas contables por período, evaluar cuotas
// y generar diagnósticos financieros locales sin acoplamiento al DOM.
// ============================================================================

import { formatARS } from './formatters.js';
import { calculateProductCost, getProductMarginPercent, findIngredientById } from './costing.js';

export function isDateInPeriod(itemDateStr, period, refDateStr) {
  if (period === 'today') return itemDateStr === refDateStr;
  const itemDate = new Date(itemDateStr + 'T12:00:00');
  const refDate = new Date(refDateStr + 'T12:00:00');
  if (period === 'month') {
    return (
      itemDate.getFullYear() === refDate.getFullYear() &&
      itemDate.getMonth() === refDate.getMonth()
    );
  }
  if (period === 'week') {
    const diffDays = Math.round((refDate - itemDate) / 86400000);
    return diffDays >= 0 && diffDays < 7;
  }
  return true;
}

export function getMetricsForPeriod(state, period, refDateStr) {
  const salesInPeriod = (state.sales || []).filter(s => isDateInPeriod(s.date, period, refDateStr));
  const expensesInPeriod = (state.expenses || []).filter(e => isDateInPeriod(e.date, period, refDateStr));

  const grossSales = salesInPeriod.reduce((sum, s) => sum + Math.round(Number(s.totalSale) || 0), 0);
  const cogsSold = salesInPeriod.reduce((sum, s) => sum + Math.round(Number(s.totalCost) || 0), 0);

  const stockPurchases = expensesInPeriod
    .filter(e => e.category === 'Mercadería / Insumos' || e.category === 'Descartables / Cajas')
    .reduce((sum, e) => sum + Math.round(Number(e.amount) || 0), 0);

  const familySupport = expensesInPeriod
    .filter(e => e.category === 'Casa y Familia (Papá)')
    .reduce((sum, e) => sum + Math.round(Number(e.amount) || 0), 0);

  const operatingExpenses = expensesInPeriod
    .filter(e => e.category !== 'Mercadería / Insumos' && e.category !== 'Descartables / Cajas')
    .reduce((sum, e) => sum + Math.round(Number(e.amount) || 0), 0);

  const grossProfitAfterReplenishment = grossSales - cogsSold;
  const netFreeProfit = grossProfitAfterReplenishment - operatingExpenses;

  console.assert(
    grossSales - cogsSold - operatingExpenses === netFreeProfit,
    'Reconciliation check: grossSales - cogsSold - operatingExpenses must equal netFreeProfit'
  );

  return {
    tandasCount: salesInPeriod.length,
    grossSales,
    cogsSold,
    stockPurchases,
    familySupport,
    operatingExpenses,
    grossProfitAfterReplenishment,
    netFreeProfit,
    salesInPeriod,
    expensesInPeriod
  };
}

export function evaluateCreditQuota(quota, monthMetrics) {
  const estimatedMonthlyNet = Math.max(monthMetrics.grossProfitAfterReplenishment - 650000, 680000);
  const safeThreshold = Math.round(estimatedMonthlyNet * 0.25);
  return {
    isSafe: quota <= safeThreshold,
    safeThreshold,
    estimatedMonthlyNet
  };
}

export function buildLocalAdvisorReply(question, state, monthM, prefixBadge) {
  const q = String(question || '').toLowerCase();
  const ingredients = state.ingredients || [];

  if (q.includes('rentable') || q.includes('ganancia') || q.includes('producto') || q.includes('margen')) {
    const byUnitProfit = [...(state.products || [])]
      .map(p => ({
        name: p.name,
        profit: p.price - calculateProductCost(p, ingredients),
        pct: getProductMarginPercent(p, ingredients)
      }))
      .sort((a, b) => b.profit - a.profit);

    const top = byUnitProfit
      .slice(0, 4)
      .map(x => `• <strong>${x.name}</strong>: +${formatARS(x.profit)} limpios (${x.pct}%)`)
      .join('<br>');
    const low = byUnitProfit
      .slice(-3)
      .map(x => `• <strong>${x.name}</strong>: +${formatARS(x.profit)} limpios (${x.pct}%)`)
      .join('<br>');
    return `${prefixBadge}<strong>Mayor ganancia limpia por venta:</strong><br>${top}<br><br><strong>Margen más chico por unidad:</strong><br>${low}`;
  }

  if (q.includes('muzzarella') || q.includes('15%') || q.includes('sube') || q.includes('aument')) {
    const muzza = findIngredientById(ingredients, 'ing_muzza');
    const currentPrice = muzza ? muzza.price : 8000;
    const nextPrice = Math.round(currentPrice * 1.15);
    const diffPerPizza = Math.round((nextPrice - currentPrice) * 0.3);
    return `${prefixBadge}Si la muzzarella sube 15% (de ${formatARS(currentPrice)} a ${formatARS(
      nextPrice
    )}/kg), el costo de cada Pizza Muzzarella sube <strong>+${formatARS(
      diffPerPizza
    )}</strong>. Para sostener tu margen del 63%, te conviene ajustar la Pizza Muzzarella de $10.000 a <strong>${formatARS(
      10000 + Math.ceil((diffPerPizza * 2.5) / 500) * 500
    )}</strong> y la Promo 3x$27.000 a <strong>${formatARS(
      27000 + Math.ceil((diffPerPizza * 3 * 2.5) / 1000) * 1000
    )}</strong>.`;
  }

  if (
    q.includes('iglesia') ||
    q.includes('alquiler') ||
    q.includes('luz') ||
    q.includes('heber') ||
    q.includes('sever') ||
    q.includes('casa') ||
    q.includes('mami')
  ) {
    const light = monthM.expensesInPeriod
      .filter(e => e.category === 'Luz' || e.category === 'Ofrenda Iglesia (Luz/Alquiler)')
      .reduce((s, e) => s + Number(e.amount), 0);
    const heber = monthM.expensesInPeriod
      .filter(e => e.category === 'Pago a Heber' || e.category === 'Pago a Sever')
      .reduce((s, e) => s + Number(e.amount), 0);
    const gas = monthM.expensesInPeriod
      .filter(e => e.category === 'Garrafa / Gas')
      .reduce((s, e) => s + Number(e.amount), 0);
    return `${prefixBadge}<strong>Balance acumulado de Octubre:</strong><br>• Ofrenda Iglesia / Luz / Alquiler: <strong>${formatARS(
      light
    )}</strong><br>• Casa y Familia (Mami / Papá): <strong>${formatARS(
      monthM.familySupport
    )}</strong><br>• Turnos pagados a Heber: <strong>${formatARS(
      heber
    )}</strong><br>• 6 Garrafas de gas: <strong>${formatARS(gas)}</strong>`;
  }

  const equip = monthM.expensesInPeriod
    .filter(e => e.category === 'Equipamiento y Local')
    .reduce((s, e) => s + Number(e.amount), 0);
  const retiros = monthM.expensesInPeriod
    .filter(e => e.category === 'Retiro Personal')
    .reduce((s, e) => s + Number(e.amount), 0);
  return `${prefixBadge}<strong>Diagnóstico de Octubre (24 cierres):</strong><br>• Vendido bruto: <strong>${formatARS(
    monthM.grossSales
  )}</strong><br>• Fondo de reposición de mercadería: <strong>${formatARS(
    monthM.cogsSold
  )}</strong> (Compras reales en el mes: ${formatARS(
    monthM.stockPurchases
  )})<br>• Inversión extraordinaria en equipamiento (Freidora, pintura, heladera): <strong>${formatARS(
    equip
  )}</strong><br>• Retiros personales (Benja $160k + Jona $118k): <strong>${formatARS(
    retiros
  )}</strong><br>• Saldo libre neto en caja hoy: <strong>${formatARS(monthM.netFreeProfit)}</strong>`;
}
