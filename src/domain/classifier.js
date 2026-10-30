// ============================================================================
// CAPA DE DOMINIO: Clasificador Inteligente de Gastos de WhatsApp
// Responsabilidad única: Parsear texto libre o líneas de WhatsApp y deducir
// categoría contable, monto en ARS, insumo asociado y precio unitario.
// ============================================================================

import { normalizeText } from './formatters.js';

const INGREDIENT_KEYWORDS = [
  { id: 'ing_muzza', rx: /\b(muzza|muzzarella|muzarela|queso|horma)\b/ },
  { id: 'ing_picada', rx: /\b(carne picada|picada)\b/ },
  { id: 'ing_milanesa', rx: /\b(nalga|milanesa|milanesas|mila|peceto)\b/ },
  { id: 'ing_bondiola', rx: /\b(bondiola|cerdo)\b/ },
  { id: 'ing_medallon', rx: /\b(paqs hamb|medallon|medallones|paty|hamburguesa)\b/ },
  { id: 'ing_empanada_u', rx: /\b(disco|discos|disquitos|tapa|tapas)\b/ },
  { id: 'ing_masa', rx: /\b(harina|levadura|lata de salsa|salsa|bollo)\b/ },
  { id: 'ing_aceite', rx: /\b(aceite|grasa|freir)\b/ },
  { id: 'ing_papa', rx: /\b(papa|papas)\b/ },
  { id: 'ing_pan', rx: /\b(pan|panes)\b/ },
  { id: 'ing_jamon', rx: /\b(jamon|paleta|fiambre)\b/ },
  { id: 'ing_verduleria', rx: /\b(lechuga|tomate|cebolla|verdeo|morron|ajo|perejil|aji|huevos)\b/ },
  { id: 'ing_coca_175', rx: /\b(coca cola 1\.75|coca 1\.75)\b/ },
  { id: 'ing_coca', rx: /\b(coca|cocacola)\b/ },
  { id: 'ing_placer', rx: /\b(placer)\b/ },
  { id: 'ing_brahma', rx: /\b(brahma|cerveza)\b/ },
  { id: 'ing_sprite', rx: /\b(sprite|manaos)\b/ }
];

export function classifyExpenseText(rawInput) {
  let raw = String(rawInput || '').trim();
  // Strip optional WhatsApp timestamp prefix like "[10/27, 10:13 PM] jona: "
  raw = raw.replace(/^\[[^\]]+\]\s*[^:]+:\s*/i, '').trim();
  // Fix common mobile keyboard typo "7.0p0" -> "7.000"
  raw = raw.replace(/(\d)\.0p0\b/gi, '$1.000');

  if (!raw || /^total\b/i.test(raw)) {
    return {
      category: 'Mercadería / Insumos',
      matchedRule: false,
      amount: 0,
      cleanDesc: '',
      ingId: '',
      detectedQty: 0,
      newUnitPrice: 0
    };
  }

  const lowerRaw = raw.toLowerCase();
  const norm = normalizeText(raw);

  // 1. Detect quantity with unit (e.g. "10kl", "10kg", "2kl", "1kg y 1/2", "1,5lt", "12 paqs")
  let detectedQty = 0;
  let textWithoutQty = norm
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:ml|lt|lts|l)\b/gi, ' ')
    .replace(/\b1[.,]75\b/g, ' ');

  const kgHalfMatch = norm.match(/\b(\d+)\s*(?:kg|kl|kilos?)\s*y\s*1\/2\b/i);
  if (kgHalfMatch) {
    detectedQty = (parseFloat(kgHalfMatch[1]) || 0) + 0.5;
    textWithoutQty = textWithoutQty.replace(kgHalfMatch[0], ' ');
  } else {
    const qtyMatch = norm.match(/\b(\d+(?:[.,]\d+)?)\s*(kg|kl|kilos?|litros?|lts?|paqs?|hormas?)\b/i);
    if (qtyMatch) {
      detectedQty = parseFloat(qtyMatch[1].replace(',', '.')) || 0;
      textWithoutQty = textWithoutQty.replace(qtyMatch[0], ' ');
    }
  }

  // 2. Detect money amount (e.g. "80.000", "26.000", "15k", OR WhatsApp shorthand "60 a mami", "25 heber")
  let amount = 0;
  let rawMoneyToken = '';
  const kMatch = textWithoutQty.match(/(?:\$\s*)?\b(\d+(?:[.,]\d+)?)\s*k\b/i);
  if (kMatch) {
    amount = Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1000);
    rawMoneyToken = kMatch[0];
  } else {
    const numMatches = [...textWithoutQty.matchAll(/(?:\$\s*)?\b(\d{1,3}(?:\.\d{3})+|\d{3,7})\b/g)];
    if (numMatches.length > 0) {
      const lastMatch = numMatches[numMatches.length - 1];
      rawMoneyToken = lastMatch[0];
      const digitsOnly = lastMatch[1].replace(/\./g, '');
      amount = parseInt(digitsOnly, 10) || 0;
    } else if (
      /\b(mami|mama|papa|heber|sever|benja|jaqui|once|aprox|salida|garrafa)\b/.test(norm)
    ) {
      const shortMatch = textWithoutQty.match(/\b([1-9]\d)\b/);
      if (shortMatch) {
        rawMoneyToken = shortMatch[0];
        amount = parseInt(shortMatch[1], 10) * 1000;
      }
    }
  }

  if (amount === 0 && /\bgarrafa\b/.test(norm)) {
    amount = 26000;
  }

  // 3. Clean description
  let cleanDesc = raw;
  if (rawMoneyToken) {
    const escaped = rawMoneyToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const stripped = raw
      .replace(new RegExp(`^\\s*\\$?\\s*${escaped}\\s*[-:·]?\\s*`, 'i'), '')
      .replace(new RegExp(`\\s*[-:·]?\\s*\\$?\\s*${escaped}\\s*\\$?\\s*$`, 'i'), '')
      .trim();
    if (stripped) cleanDesc = stripped;
  }
  if (cleanDesc) {
    cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
  }

  // 4. Deduce Category & Ingredient match based on real October logs
  let category = 'Mercadería / Insumos';
  let matchedRule = false;
  let ingId = '';

  const isNegativeLoss =
    /^-\s*\d/.test(raw) ||
    /\b(se perdieron|para nosotros|jaki y mati|no pagaron)\b/.test(norm);

  const hasDadAccent = lowerRaw.includes('papá');
  const hasPotatoContext = /\b(frita|fritas|bolsa|cajon|kg|kl|kilo|kilos|pelar|noisette|bolitas)\b/.test(norm);
  const hasFamilyWords =
    /\b(mami|mama|remedio|remedios|farmacia|medico|operacion|clinica|hospital|salud|casa|familia|cosas de casa|pepsi para casa|jabon y cloro|galletitas para mami|para mami)\b/.test(
      norm
    );

  if (isNegativeLoss) {
    category = 'Consumo / Merma';
    matchedRule = true;
  } else if (hasDadAccent || hasFamilyWords || (/\bpapa\b/.test(norm) && !hasPotatoContext)) {
    category = 'Casa y Familia (Papá)';
    matchedRule = true;
  } else if (/\b(heber|sever|ayudante|empleado|jornal|turno heber)\b/.test(norm)) {
    category = 'Pago a Heber';
    matchedRule = true;
  } else if (/\b(garrafa|garrafas|gas|tubo|envase)\b/.test(norm)) {
    category = 'Garrafa / Gas';
    matchedRule = true;
  } else if (/\b(ofrenda|ofrendas|iglesia|diezmo|culto|templo|pastor)\b/.test(norm)) {
    category = 'Ofrenda Iglesia (Luz/Alquiler)';
    matchedRule = true;
  } else if (/\b(freidora|heladera|elastico|pintura|trapos|equipamiento|arreglo|freezer|horno)\b/.test(norm)) {
    category = 'Equipamiento y Local';
    matchedRule = true;
  } else if (/\b(alquiler|renta|locacion|inmobiliaria)\b/.test(norm)) {
    category = 'Alquiler';
    matchedRule = true;
  } else if (/\b(luz|edenor|edesur|electricidad|boleta luz|energia)\b/.test(norm)) {
    category = 'Luz';
    matchedRule = true;
  } else if (
    /\b(caja|cajas|bolsa|bolsas|papel|bandeja|bandejas|servilleta|descartable|descartables|film|rollo de cocina|detergente|colorante|cinta)\b/.test(
      norm
    )
  ) {
    category = 'Descartables / Cajas';
    matchedRule = true;
    ingId = 'ing_caja';
  } else if (/\b(benja|jonatan|jaqui|once|salida|helado|cumple|garrapinadas|rosquita|retiro|personal)\b/.test(norm)) {
    category = 'Retiro Personal';
    matchedRule = true;
  }

  if (!matchedRule || category === 'Mercadería / Insumos') {
    for (const item of INGREDIENT_KEYWORDS) {
      if (item.rx.test(norm)) {
        ingId = item.id;
        if (!matchedRule) {
          category = 'Mercadería / Insumos';
          matchedRule = true;
        }
        break;
      }
    }
  }

  let newUnitPrice = 0;
  if (ingId && amount > 0 && detectedQty > 0) {
    newUnitPrice = Math.round(amount / detectedQty);
  }

  return {
    category,
    matchedRule,
    amount,
    cleanDesc,
    ingId,
    detectedQty,
    newUnitPrice
  };
}
