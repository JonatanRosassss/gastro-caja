// ============================================================================
// CAPA DE DATOS: Cliente Google Gemini IA
// Responsabilidad única: Descubrir modelos Flash disponibles en la cuenta del
// usuario y ejecutar consultas financieras contra la API REST de Gemini.
// ============================================================================

import { calculateProductCost, getProductMarginPercent } from '../domain/costing.js';

let cachedDiscoveredModels = null;

export function clearDiscoveredModelsCache() {
  cachedDiscoveredModels = null;
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverAvailableGeminiModels(rawKey) {
  if (!rawKey) return [];
  if (cachedDiscoveredModels && cachedDiscoveredModels.key === rawKey) {
    return cachedDiscoveredModels.list;
  }
  try {
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(rawKey)}`,
      {},
      4500
    );
    if (!res.ok) return [];
    const data = await res.json();
    const rawModels = Array.isArray(data?.models) ? data.models : [];

    const candidates = rawModels
      .filter(m => {
        const methods = m.supportedGenerationMethods || [];
        const id = String(m.name || '').replace(/^models\//, '');
        if (!methods.includes('generateContent')) return false;
        if (!id.startsWith('gemini-')) return false;
        if (
          /^(gemini-1\.0|gemini-1\.5-pro|.*(embedding|imagen|veo|tts|audio|live|image|vision|robotics|computer-use|aqa|bisheng|thinking|learnlm|gemma|exp-).*)/i.test(
            id
          )
        ) {
          return false;
        }
        return true;
      })
      .map(m => String(m.name).replace(/^models\//, ''));

    const scoreModel = id => {
      const verMatch = id.match(/gemini-(\d+(?:\.\d+)?)/);
      const ver = verMatch ? parseFloat(verMatch[1]) : 2.0;
      let score = ver * 100;
      if (id.includes('flash') && !id.includes('lite') && !id.includes('8b')) score += 1000;
      else if (id.includes('flash-lite')) score += 600;
      else if (id.includes('pro')) score += 100;
      if (!/-\d{2}-\d{2}/.test(id) && !id.includes('preview')) score += 30;
      return score;
    };

    candidates.sort((a, b) => scoreModel(b) - scoreModel(a));
    cachedDiscoveredModels = { key: rawKey, list: candidates };
    return candidates;
  } catch (e) {
    return [];
  }
}

export async function queryGeminiAdvisor({ rawKey, preferredModel, question, state, monthM, onModelTry }) {
  const catTotals = {};
  monthM.expensesInPeriod.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount || 0);
  });

  const ingredients = state.ingredients || [];
  const payload = {
    negocio:
      'Local gastronómico de Jonatan y Benja (Pizzas, Empanadas, Bondiola, Milanesa, Hamburguesas, Papas y Bebidas). Empleado por turno: Heber.',
    mesOctubreCompleto: {
      cierresTotales: monthM.tandasCount,
      vendidoBruto: monthM.grossSales,
      costoReposicionMercaderiaVendida: monthM.cogsSold,
      comprasRealesInsumosYDescartables: monthM.stockPurchases,
      salidasOperativasCasaYRetiros: monthM.operatingExpenses,
      aporteCasaMamiPapa: monthM.familySupport,
      saldoLibreEnCaja: monthM.netFreeProfit,
      desgloseEgresosPorCategoria: catTotals
    },
    costosInsumosActuales: ingredients.map(i => ({
      insumo: i.name,
      unidad: i.unit,
      costoARS: i.price
    })),
    cartaProductosYMargenes: (state.products || []).map(p => ({
      producto: p.name,
      precioVentaARS: p.price,
      costoRecetaARS: calculateProductCost(p, ingredients),
      gananciaLimpiaUnitariaARS: p.price - calculateProductCost(p, ingredients),
      margenPorcentaje: getProductMarginPercent(p, ingredients) + '%'
    }))
  };

  const discovered = await discoverAvailableGeminiModels(rawKey);
  const preferred = preferredModel || 'auto';

  let candidateList = [];
  if (preferred !== 'auto') {
    candidateList = [preferred, ...discovered, 'gemini-2.5-flash', 'gemini-2.0-flash'];
  } else if (discovered.length > 0) {
    candidateList = discovered;
  } else {
    candidateList = [
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.0-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash'
    ];
  }

  const modelsToTry = [...new Set(candidateList.filter(Boolean))].slice(0, 3);
  let lastErrorNotice = '';

  for (const modelName of modelsToTry) {
    try {
      if (typeof onModelTry === 'function') onModelTry(modelName, discovered);
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
          rawKey
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text:
                      `Sos el consultor financiero y gastronómico de confianza de Jonatan y su hermano Benja en Argentina. ` +
                      `Hablales en español rioplatense claro, conciso y práctico (usá pesos argentinos con formato $XX.XXX). ` +
                      `Respondé su consulta usando exactamente los datos reales de su negocio en Octubre que están en este JSON: ${JSON.stringify(
                        payload
                      )}.\n\nConsulta del usuario: ${question}`
                  }
                ]
              }
            ]
          })
        },
        14000
      );
      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const nonThoughtParts = parts.filter(p => !p.thought && p.text);
      const reply = (nonThoughtParts.length ? nonThoughtParts : parts)
        .map(p => p.text || '')
        .join('\n')
        .trim();

      if (res.ok && reply) {
        return { ok: true, modelName, reply, discovered };
      }
      if (data?.error?.message) {
        lastErrorNotice = `${modelName}: ${data.error.message}`;
        if (
          lastErrorNotice.toLowerCase().includes('api key not valid') ||
          lastErrorNotice.toLowerCase().includes('api_key_invalid')
        ) {
          break;
        }
      }
    } catch (err) {
      lastErrorNotice =
        err?.name === 'AbortError'
          ? `Tiempo de espera agotado en ${modelName}`
          : `Error de red al conectar con ${modelName}`;
    }
  }

  return { ok: false, errorNotice: lastErrorNotice, discovered };
}
