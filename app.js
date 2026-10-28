// Caja & Cocina — Libro Mayor Gastronómico
// Datos reales de Octubre (Jonatan, Benja y Heber)

const STORAGE_KEY = 'gastro_caja_octubre_real_v1';

function getOffsetDateISO(daysAgo = 0) {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - offset - daysAgo * 86400000);
  return local.toISOString().slice(0, 10);
}

function getCurrentTimeHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; // taste-skill-ignore: clock time
}

function formatARS(num) {
  const n = Math.round(Number(num) || 0);
  const abs = Math.abs(n).toLocaleString('es-AR');
  return n < 0 ? `\u2212$${abs}` : `$${abs}`;
}

function formatSignedARS(num) {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return '$0';
  const abs = Math.abs(n).toLocaleString('es-AR');
  return n > 0 ? `+$${abs}` : `\u2212$${abs}`;
}

function normalizeText(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ============================================================================
// SMART EXPENSE AUTO-CLASSIFIER (Calibrated to Jonatan & Benja's WhatsApp logs)
// ============================================================================
function classifyExpenseText(rawInput) {
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
  let textWithoutQty = norm;
  // Remove beverage bottle sizes like 600ml, 500ml, 1.75, 1,5lt before money matching
  textWithoutQty = textWithoutQty
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

  // 2. Detect money amount (e.g. "80.000", "26.000", "15k", OR WhatsApp shorthand "60 a mami", "25 heber", "benja 80")
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
      // Shorthand in thousands used in WhatsApp: "60 a mami", "25 heber", "heber 28", "benja 80", "gaste 20 aprox"
      const shortMatch = textWithoutQty.match(/\b([1-9]\d)\b/);
      if (shortMatch) {
        rawMoneyToken = shortMatch[0];
        amount = parseInt(shortMatch[1], 10) * 1000;
      }
    }
  }

  // Default garrafa to $26.000 if user only wrote "garrafa"
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

  // Specific ingredient matching
  const ingKeywords = [
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

  if (!matchedRule || category === 'Mercadería / Insumos') {
    for (const item of ingKeywords) {
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

function getInitialState() {
  return {
    meta: {
      dailySalesGoal: 100000,
      rentTotalReal: 800000,
      rentMyGoal: 220000,
      lightTotalReal: 270000,
      lightMyGoal: 150000,
      firebaseUrl: '',
      geminiApiKey: '',
      lastUpdated: Date.now()
    },
    ingredients: [
      { id: 'ing_muzza', name: 'Muzzarella (10kg = $80.000)', unit: 'kg', price: 8000 },
      { id: 'ing_masa', name: 'Bollo pizza (harina + levadura + salsa)', unit: 'unid', price: 1050 },
      { id: 'ing_picada', name: 'Carne picada (2kg = $20.000)', unit: 'kg', price: 10000 },
      { id: 'ing_milanesa', name: 'Nalga / Milanesa preparada', unit: 'unid', price: 2400 },
      { id: 'ing_bondiola', name: 'Bondiola (1,5kg = $11.000)', unit: 'kg', price: 7333 },
      { id: 'ing_medallon', name: 'Medallón hamburguesa (12 paq = $26k)', unit: 'unid', price: 1083 },
      { id: 'ing_empanada_u', name: 'Disco de empanada + relleno', unit: 'unid', price: 480 },
      { id: 'ing_papa', name: 'Papas fritas / Noisette (7 bolsas = $31k)', unit: 'bolsa', price: 4430 },
      { id: 'ing_aceite', name: 'Aceite ($17.500) y grasa ($2.500)', unit: 'litro', price: 2500 },
      { id: 'ing_pan', name: 'Pan de sánguche o hamburguesa', unit: 'unid', price: 550 },
      { id: 'ing_jamon', name: 'Jamón cocido', unit: 'kg', price: 9000 },
      { id: 'ing_verduleria', name: 'Verdulería (lechuga, tomate, cebolla, morrón)', unit: 'kg', price: 3200 },
      { id: 'ing_caja', name: 'Caja de pizza / Bandeja / Papel / Bolsa', unit: 'unid', price: 450 },
      { id: 'ing_coca_175', name: 'Coca-Cola 1.75L (pack $27.000)', unit: 'unid', price: 3400 },
      { id: 'ing_coca', name: 'Coca-Cola 500ml/600ml (pack $9.000)', unit: 'unid', price: 1500 },
      { id: 'ing_sprite', name: 'Sprite / Manaos (costo)', unit: 'unid', price: 1600 },
      { id: 'ing_placer', name: 'Agua Placer 500ml / 1.5L (pack $5.600)', unit: 'unid', price: 933 },
      { id: 'ing_brahma', name: 'Cerveza Brahma (pack x6 = $11.000)', unit: 'unid', price: 1833 }
    ],
    products: [
      // PIZZAS Y PROMOS (Precios exactos de Octubre)
      {
        id: 'prod_muzza',
        name: 'Pizza Muzzarella',
        category: 'Pizzas',
        price: 10000,
        recipe: [
          { ingId: 'ing_masa', qty: 1 },
          { ingId: 'ing_muzza', qty: 0.28 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_promo_3x27',
        name: 'Promo 3 Muzzas (3x$27.000)',
        category: 'Pizzas',
        price: 27000,
        recipe: [
          { ingId: 'ing_masa', qty: 3 },
          { ingId: 'ing_muzza', qty: 0.80 },
          { ingId: 'ing_caja', qty: 3 }
        ]
      },
      {
        id: 'prod_jamon',
        name: 'Pizza Especial Jamón',
        category: 'Pizzas',
        price: 13000,
        recipe: [
          { ingId: 'ing_masa', qty: 1 },
          { ingId: 'ing_muzza', qty: 0.28 },
          { ingId: 'ing_jamon', qty: 0.12 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_napo',
        name: 'Pizza Napolitana',
        category: 'Pizzas',
        price: 13000,
        recipe: [
          { ingId: 'ing_masa', qty: 1 },
          { ingId: 'ing_muzza', qty: 0.28 },
          { ingId: 'ing_verduleria', qty: 0.20 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_napo_jamon',
        name: 'Pizza Napo con Jamón',
        category: 'Pizzas',
        price: 15000,
        recipe: [
          { ingId: 'ing_masa', qty: 1 },
          { ingId: 'ing_muzza', qty: 0.28 },
          { ingId: 'ing_jamon', qty: 0.12 },
          { ingId: 'ing_verduleria', qty: 0.20 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_jamon_morron',
        name: 'Pizza Jamón y Morrón (JyM)',
        category: 'Pizzas',
        price: 16000,
        recipe: [
          { ingId: 'ing_masa', qty: 1 },
          { ingId: 'ing_muzza', qty: 0.28 },
          { ingId: 'ing_jamon', qty: 0.12 },
          { ingId: 'ing_verduleria', qty: 0.15 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_promo_muzza_esp',
        name: 'Promo Muzza + Especial',
        category: 'Pizzas',
        price: 23000,
        recipe: [
          { ingId: 'ing_masa', qty: 2 },
          { ingId: 'ing_muzza', qty: 0.56 },
          { ingId: 'ing_jamon', qty: 0.12 },
          { ingId: 'ing_caja', qty: 2 }
        ]
      },
      // EMPANADAS Y MINUTAS (Precios exactos de Octubre)
      {
        id: 'prod_docena_emp',
        name: 'Docena Empanadas Fritas',
        category: 'Minutas',
        price: 14000,
        recipe: [
          { ingId: 'ing_empanada_u', qty: 12 },
          { ingId: 'ing_aceite', qty: 0.25 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_docena_horno',
        name: 'Docena Emp. Horno Grande',
        category: 'Minutas',
        price: 16000,
        recipe: [
          { ingId: 'ing_empanada_u', qty: 12 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_media_emp',
        name: 'Media Docena Empanadas',
        category: 'Minutas',
        price: 7000,
        recipe: [
          { ingId: 'ing_empanada_u', qty: 6 },
          { ingId: 'ing_aceite', qty: 0.12 },
          { ingId: 'ing_caja', qty: 0.5 }
        ]
      },
      {
        id: 'prod_4_emp',
        name: '4 Empanadas Fritas',
        category: 'Minutas',
        price: 4800,
        recipe: [
          { ingId: 'ing_empanada_u', qty: 4 },
          { ingId: 'ing_aceite', qty: 0.08 }
        ]
      },
      {
        id: 'prod_emp_u',
        name: 'Empanada Frita (Unidad)',
        category: 'Minutas',
        price: 1500,
        recipe: [
          { ingId: 'ing_empanada_u', qty: 1 },
          { ingId: 'ing_aceite', qty: 0.02 }
        ]
      },
      {
        id: 'prod_bondiola',
        name: 'Sánguche de Bondiola',
        category: 'Minutas',
        price: 7000,
        recipe: [
          { ingId: 'ing_pan', qty: 1 },
          { ingId: 'ing_bondiola', qty: 0.22 },
          { ingId: 'ing_caja', qty: 0.5 }
        ]
      },
      {
        id: 'prod_bondiola_papas',
        name: 'Bondiola + Guarnición Papas',
        category: 'Minutas',
        price: 9500,
        recipe: [
          { ingId: 'ing_pan', qty: 1 },
          { ingId: 'ing_bondiola', qty: 0.22 },
          { ingId: 'ing_papa', qty: 0.20 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_mila_grande',
        name: 'Sánguche de Mila Grande',
        category: 'Minutas',
        price: 14000,
        recipe: [
          { ingId: 'ing_pan', qty: 1.5 },
          { ingId: 'ing_milanesa', qty: 1.5 },
          { ingId: 'ing_verduleria', qty: 0.15 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_mila_ind',
        name: 'Sánguche Mila Individual',
        category: 'Minutas',
        price: 6000,
        recipe: [
          { ingId: 'ing_pan', qty: 1 },
          { ingId: 'ing_milanesa', qty: 0.8 },
          { ingId: 'ing_caja', qty: 0.5 }
        ]
      },
      {
        id: 'prod_hamburguesa',
        name: 'Hamburguesa',
        category: 'Minutas',
        price: 6000,
        recipe: [
          { ingId: 'ing_pan', qty: 1 },
          { ingId: 'ing_medallon', qty: 1 },
          { ingId: 'ing_papa', qty: 0.15 },
          { ingId: 'ing_caja', qty: 0.5 }
        ]
      },
      {
        id: 'prod_hamb_doble',
        name: 'Hamburguesa Doble + Papas',
        category: 'Minutas',
        price: 10000,
        recipe: [
          { ingId: 'ing_pan', qty: 1 },
          { ingId: 'ing_medallon', qty: 2 },
          { ingId: 'ing_muzza', qty: 0.06 },
          { ingId: 'ing_papa', qty: 0.25 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_papas_grande',
        name: 'Porción Grande de Papas',
        category: 'Minutas',
        price: 8000,
        recipe: [
          { ingId: 'ing_papa', qty: 0.55 },
          { ingId: 'ing_aceite', qty: 0.15 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_papas',
        name: 'Porción de Papas Fritas',
        category: 'Minutas',
        price: 5000,
        recipe: [
          { ingId: 'ing_papa', qty: 0.35 },
          { ingId: 'ing_aceite', qty: 0.10 },
          { ingId: 'ing_caja', qty: 0.5 }
        ]
      },
      {
        id: 'prod_noisette',
        name: 'Papas Noisette / Bolitas',
        category: 'Minutas',
        price: 4500,
        recipe: [
          { ingId: 'ing_papa', qty: 0.32 },
          { ingId: 'ing_aceite', qty: 0.08 },
          { ingId: 'ing_caja', qty: 0.5 }
        ]
      },
      {
        id: 'prod_cono_papas',
        name: 'Cono de Papas',
        category: 'Minutas',
        price: 3000,
        recipe: [
          { ingId: 'ing_papa', qty: 0.22 },
          { ingId: 'ing_aceite', qty: 0.06 }
        ]
      },
      // BEBIDAS (Precios exactos de Octubre)
      {
        id: 'prod_coca_175',
        name: 'Coca-Cola 1.75L',
        category: 'Bebidas',
        price: 5500,
        recipe: [{ ingId: 'ing_coca_175', qty: 1 }]
      },
      {
        id: 'prod_coca_500',
        name: 'Coca-Cola 500ml / 600ml',
        category: 'Bebidas',
        price: 3000,
        recipe: [{ ingId: 'ing_coca', qty: 1 }]
      },
      {
        id: 'prod_sprite',
        name: 'Sprite',
        category: 'Bebidas',
        price: 3000,
        recipe: [{ ingId: 'ing_sprite', qty: 1 }]
      },
      {
        id: 'prod_manaos',
        name: 'Manaos',
        category: 'Bebidas',
        price: 3000,
        recipe: [{ ingId: 'ing_sprite', qty: 1 }]
      },
      {
        id: 'prod_placer_15',
        name: 'Agua Placer Grande 1.5L',
        category: 'Bebidas',
        price: 3000,
        recipe: [{ ingId: 'ing_placer', qty: 1 }]
      },
      {
        id: 'prod_placer_500',
        name: 'Agua Placer 500ml',
        category: 'Bebidas',
        price: 2000,
        recipe: [{ ingId: 'ing_placer', qty: 1 }]
      },
      {
        id: 'prod_brahma',
        name: 'Cerveza Brahma',
        category: 'Bebidas',
        price: 3500,
        recipe: [{ ingId: 'ing_brahma', qty: 1 }]
      }
    ],
    // INGRESOS REALES DE OCTUBRE (1/10 al 27/10 del PDF de WhatsApp)
    sales: [
      {
        id: 'oct_s_01',
        date: '2026-10-01',
        time: '23:55',
        operator: 'Jonatan',
        note: 'TOTAL 1/10 (3 Muzza, Promo 3x27, 1 doc emp, 2 emp)',
        totalSale: 73500,
        totalCost: 29800,
        items: [
          { prodId: 'prod_muzza', name: 'Pizza Muzzarella', qty: 3, unitPrice: 10000, unitCost: 3740 },
          { prodId: 'prod_promo_3x27', name: 'Promo 3 Muzzas', qty: 1, unitPrice: 27000, unitCost: 10900 },
          { prodId: 'prod_docena_emp', name: 'Docena Empanadas + 2 emp', qty: 1, unitPrice: 16500, unitCost: 7680 }
        ]
      },
      {
        id: 'oct_s_03',
        date: '2026-10-03',
        time: '23:40',
        operator: 'Jonatan',
        note: 'Promo 3x27, 2 Sang Mila, 1 Ind, 2 Medias Emp, 4 Emp, Muzza, Placer, Ale',
        totalSale: 101800,
        totalCost: 41200,
        items: [
          { prodId: 'prod_promo_3x27', name: 'Promo 3x27 + Muzza', qty: 1, unitPrice: 37000, unitCost: 14640 },
          { prodId: 'prod_mila_grande', name: '2 Sánguches Mila + 1 Ind', qty: 2, unitPrice: 17000, unitCost: 7800 },
          { prodId: 'prod_docena_emp', name: 'Empanadas + Combo Ale + Placer', qty: 1, unitPrice: 30800, unitCost: 10960 }
        ]
      },
      {
        id: 'oct_s_04',
        date: '2026-10-04',
        time: '23:50',
        operator: 'Jonatan',
        note: 'TOTAL 4/10 (6 Muzzas, Napo, 2 Sang Mila, Doc Emp, Bondiola, Hamb, Bebidas)',
        totalSale: 156700,
        totalCost: 62680,
        items: [
          { prodId: 'prod_muzza', name: '6 Muzzas + 1 Napo', qty: 7, unitPrice: 10285, unitCost: 3900 },
          { prodId: 'prod_mila_grande', name: '2 Sang Mila + Bondiola + Hamb + Papas', qty: 1, unitPrice: 46000, unitCost: 19200 },
          { prodId: 'prod_docena_emp', name: 'Docena Emp + 7 Emp + 2 Cocas + 2 Manaos + Ale', qty: 1, unitPrice: 38700, unitCost: 16180 }
        ]
      },
      {
        id: 'oct_s_06',
        date: '2026-10-06',
        time: '23:50',
        operator: 'Jonatan',
        note: '4 Promos 3x27 ($108k), 2 Muzzas, Media Doc + 3 Emp, Bondiola',
        totalSale: 145600,
        totalCost: 58900,
        items: [
          { prodId: 'prod_promo_3x27', name: 'Promo 3x27', qty: 4, unitPrice: 27000, unitCost: 10900 },
          { prodId: 'prod_muzza', name: '2 Muzzas + Bondiola + 9 Empanadas', qty: 1, unitPrice: 37600, unitCost: 15300 }
        ]
      },
      {
        id: 'oct_s_07',
        date: '2026-10-07',
        time: '23:24',
        operator: 'Jonatan',
        note: 'Docena emp, Mila ind, Hamb + papas',
        totalSale: 30000,
        totalCost: 12400,
        items: [
          { prodId: 'prod_docena_emp', name: 'Docena emp + Mila ind + Hamb c/papas', qty: 1, unitPrice: 30000, unitCost: 12400 }
        ]
      },
      {
        id: 'oct_s_08',
        date: '2026-10-08',
        time: '23:50',
        operator: 'Jonatan',
        note: '2 Muzzas, Bondiola, Bondiola c/papas, Media Emp, Cono bolitas',
        totalSale: 48000,
        totalCost: 19400,
        items: [
          { prodId: 'prod_muzza', name: '2 Muzzas + 2 Bondiolas + Media Emp + Bolitas', qty: 1, unitPrice: 48000, unitCost: 19400 }
        ]
      },
      {
        id: 'oct_s_10',
        date: '2026-10-10',
        time: '23:41',
        operator: 'Jonatan',
        note: 'JyM $15k, Napo c/J $15k, Muzza, Doc Emp, 2 Hamb, Bondiola, Manaos',
        totalSale: 77000,
        totalCost: 31200,
        items: [
          { prodId: 'prod_jamon_morron', name: 'JyM + Napo c/J + Muzza + Doc Emp + 2 Hamb + Bondiola', qty: 1, unitPrice: 77000, unitCost: 31200 }
        ]
      },
      {
        id: 'oct_s_11_1',
        date: '2026-10-11',
        time: '22:39',
        operator: 'Jonatan',
        note: '2 Bondiola, 2 Cocas, Promo Muzza+Napo, Muzza, 8 Emp, Ale',
        totalSale: 67400,
        totalCost: 27100,
        items: [
          { prodId: 'prod_promo_muzza_esp', name: 'Muzza + Napo c/J + Muzza + 2 Bondiola + 8 Emp + 2 Cocas', qty: 1, unitPrice: 67400, unitCost: 27100 }
        ]
      },
      {
        id: 'oct_s_11_2',
        date: '2026-10-11',
        time: '23:55',
        operator: 'Benja',
        note: '2 Promos 3x27, 2 Jamón, 1 JyM, 1 Hamb doble',
        totalSale: 103000,
        totalCost: 41500,
        items: [
          { prodId: 'prod_promo_3x27', name: '2 Promos 3x27 + 2 Jamón + JyM + Hamb doble', qty: 1, unitPrice: 103000, unitCost: 41500 }
        ]
      },
      {
        id: 'oct_s_13',
        date: '2026-10-13',
        time: '23:45',
        operator: 'Jonatan',
        note: '3 Muzzas, 2 Conos de papas, 8 Empanadas',
        totalSale: 45600,
        totalCost: 18200,
        items: [
          { prodId: 'prod_muzza', name: '3 Muzzas + 2 Conos + 8 Empanadas', qty: 1, unitPrice: 45600, unitCost: 18200 }
        ]
      },
      {
        id: 'oct_s_14',
        date: '2026-10-14',
        time: '23:30',
        operator: 'Jonatan',
        note: '1 Muzza, Ale $9.000, 4 Empanadas',
        totalSale: 23800,
        totalCost: 9600,
        items: [
          { prodId: 'prod_muzza', name: 'Muzza + Ale + 4 Empanadas', qty: 1, unitPrice: 23800, unitCost: 9600 }
        ]
      },
      {
        id: 'oct_s_15',
        date: '2026-10-15',
        time: '23:29',
        operator: 'Jonatan',
        note: '2 Docenas Emp Horno Grande, Media Fritas, Promo Muzza, Ale $8k',
        totalSale: 74000,
        totalCost: 29800,
        items: [
          { prodId: 'prod_docena_horno', name: '2 Doc Horno + Media Fritas + Promo 3x27 + Ale', qty: 1, unitPrice: 74000, unitCost: 29800 }
        ]
      },
      {
        id: 'oct_s_16',
        date: '2026-10-16',
        time: '23:55',
        operator: 'Jonatan',
        note: 'TOTAL 16/10 (Muzzas, Promo+Esp, Napo, 4 Sang Mila, 6 Bondiolas, Doc Emp, Papas)',
        totalSale: 189000,
        totalCost: 75600,
        items: [
          { prodId: 'prod_mila_grande', name: 'Cierre completo Viernes 16/10', qty: 1, unitPrice: 189000, unitCost: 75600 }
        ]
      },
      {
        id: 'oct_s_17',
        date: '2026-10-17',
        time: '22:47',
        operator: 'Benja',
        note: '6 Bondiolas ($42k), 2 Muzzas, Napo c/J, Sang Mila, Hamb, Cono papas',
        totalSale: 100000,
        totalCost: 39800,
        items: [
          { prodId: 'prod_bondiola', name: '6 Bondiolas + 2 Muzzas + Napo c/J + Mila + Hamb', qty: 1, unitPrice: 100000, unitCost: 39800 }
        ]
      },
      {
        id: 'oct_s_18_1',
        date: '2026-10-18',
        time: '21:45',
        operator: 'Benja',
        note: '6 Hamburguesas ($36k), 4 Muzzas ($40k), Napo c/J, Media Doc + 4 Emp, 2 Placer',
        totalSale: 110000,
        totalCost: 44100,
        items: [
          { prodId: 'prod_hamburguesa', name: '6 Hamb + 4 Muzzas + Napo c/J + 10 Emp + 2 Placer', qty: 1, unitPrice: 110000, unitCost: 44100 }
        ]
      },
      {
        id: 'oct_s_18_2',
        date: '2026-10-18',
        time: '23:59',
        operator: 'Benja',
        note: '3 Hamb ($18k), 3 Mila Ind ($18k), 2 Bondiola ($14k), Muzza, Papas Grande',
        totalSale: 68000,
        totalCost: 27400,
        items: [
          { prodId: 'prod_mila_ind', name: '3 Hamb + 3 Mila + 2 Bondiola + Muzza + Papas', qty: 1, unitPrice: 68000, unitCost: 27400 }
        ]
      },
      {
        id: 'oct_s_20',
        date: '2026-10-20',
        time: '23:57',
        operator: 'Jonatan',
        note: 'TOTAL 20/10 (Promo Napo+Jamón+Muzza $33k, Muzza, 5 Hamb, Doc+5 Emp, Bondiola, 5 Gaseosas)',
        totalSale: 122000,
        totalCost: 49200,
        items: [
          { prodId: 'prod_muzza', name: 'Cierre Martes 20/10', qty: 1, unitPrice: 122000, unitCost: 49200 }
        ]
      },
      {
        id: 'oct_s_21',
        date: '2026-10-21',
        time: '23:55',
        operator: 'Jonatan',
        note: 'TOTAL 78.800 (3 Muzzas, 3 Bondiolas, 13 Empanadas, Porción papas, 2 Cocas)',
        totalSale: 78800,
        totalCost: 31400,
        items: [
          { prodId: 'prod_muzza', name: '3 Muzzas + 3 Bondiolas + 13 Emp + Papas + 2 Cocas', qty: 1, unitPrice: 78800, unitCost: 31400 }
        ]
      },
      {
        id: 'oct_s_23_1',
        date: '2026-10-23',
        time: '12:16',
        operator: 'Jonatan',
        note: 'Turno mediodía: 2 Hamb, Napo c/Jamón, Muzza',
        totalSale: 37000,
        totalCost: 14800,
        items: [
          { prodId: 'prod_napo_jamon', name: '2 Hamb + Napo c/Jamón + Muzza', qty: 1, unitPrice: 37000, unitCost: 14800 }
        ]
      },
      {
        id: 'oct_s_23_2',
        date: '2026-10-23',
        time: '23:58',
        operator: 'Jonatan',
        note: 'TOTAL VIERNES 23/10 (7 Muzzas, Napo, Plato Mila, 2 Medias + 5 Emp, 4 Porciones Papas, 3 Brahmas, Cocas)',
        totalSale: 162000,
        totalCost: 64900,
        items: [
          { prodId: 'prod_muzza', name: 'Cierre Viernes 23/10 Noche', qty: 1, unitPrice: 162000, unitCost: 64900 }
        ]
      },
      {
        id: 'oct_s_24',
        date: '2026-10-24',
        time: '23:55',
        operator: 'Jonatan',
        note: 'TOTAL SÁBADO 24/10 (Promo 3x27, 4 Hamb, 2 Bondiolas, 3 Bondiola+Papa, 10 Emp, Papas, Coca, Placer)',
        totalSale: 122200,
        totalCost: 48800,
        items: [
          { prodId: 'prod_promo_3x27', name: 'Cierre Sábado 24/10', qty: 1, unitPrice: 122200, unitCost: 48800 }
        ]
      },
      {
        id: 'oct_s_25_1',
        date: '2026-10-25',
        time: '21:21',
        operator: 'Jonatan',
        note: 'Tanda 1 Domingo: 3 Jamón ($39k), JyM ($16k), Promo 3 Muzzas ($27k), Napo ($13k), 9 Emp, Coca (-$6k desc)',
        totalSale: 105000,
        totalCost: 42100,
        items: [
          { prodId: 'prod_jamon', name: '3 Jamón + JyM + 3 Muzzas + Napo + 9 Emp + Coca', qty: 1, unitPrice: 105000, unitCost: 42100 }
        ]
      },
      {
        id: 'oct_s_25_2',
        date: '2026-10-25',
        time: '23:50',
        operator: 'Jonatan',
        note: 'Tanda 2 Domingo: Promo 3x27, Muzza, 2 Mila Grande ($28k), Mila Ind, 3 Bondiolas, 5 Hamb, Media+8 Emp, Papas',
        totalSale: 147300,
        totalCost: 59100,
        items: [
          { prodId: 'prod_mila_grande', name: 'Tanda cierre Domingo 25/10', qty: 1, unitPrice: 147300, unitCost: 59100 }
        ]
      },
      {
        id: 'oct_s_27',
        date: '2026-10-27',
        time: '23:12',
        operator: 'Jonatan',
        note: 'Martes 27/10: Pizza Jamón y Morrón ($16k), Muzza ($10k), Sánguche Mila + Papas ($9k)',
        totalSale: 35000,
        totalCost: 14100,
        items: [
          { prodId: 'prod_jamon_morron', name: 'Pizza Jamón y Morrón (JyM)', qty: 1, unitPrice: 16000, unitCost: 4850 },
          { prodId: 'prod_muzza', name: 'Pizza Muzzarella', qty: 1, unitPrice: 10000, unitCost: 3740 },
          { prodId: 'prod_mila_ind', name: 'Sánguche Mila + Papas', qty: 1, unitPrice: 9000, unitCost: 4200 }
        ]
      }
    ],
    // EGRESOS REALES DE OCTUBRE (1/10 al 28/10 del PDF de WhatsApp)
    expenses: [
      // 1/10 y 2/10
      { id: 'oct_e_01', date: '2026-10-01', time: '01:29', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Aceite ($17.500), Harina ($20.000) y Levadura ($4.500)', amount: 42000 },
      { id: 'oct_e_02', date: '2026-10-01', time: '01:30', operator: 'Jonatan', category: 'Consumo / Merma', description: '4 empanadas (Jaki y Mati)', amount: 2000 },
      { id: 'oct_e_03', date: '2026-10-02', time: '02:29', operator: 'Jonatan', category: 'Consumo / Merma', description: 'Pizza para nosotros', amount: 4000 },
      { id: 'oct_e_04', date: '2026-10-02', time: '02:30', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Disquitos de empanada', amount: 1800 },
      // 5/10
      { id: 'oct_e_05', date: '2026-10-05', time: '22:01', operator: 'Jonatan', category: 'Descartables / Cajas', description: 'Papel manteca ($5.700), papel envolver ($4.500) y bandejas ($8.500)', amount: 18700 },
      { id: 'oct_e_06', date: '2026-10-05', time: '22:02', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Nalga ($18.000) y Carne picada 2kg ($20.000)', amount: 38000 },
      // 7/10
      { id: 'oct_e_07', date: '2026-10-07', time: '02:27', operator: 'Jonatan', category: 'Garrafa / Gas', description: 'Garrafa', amount: 26000 },
      { id: 'oct_e_08', date: '2026-10-07', time: '02:28', operator: 'Jonatan', category: 'Pago a Heber', description: 'Pago a Heber', amount: 30000 },
      { id: 'oct_e_09', date: '2026-10-07', time: '02:29', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Disco de emp ($7.800) y Ajo + lechuga + tomate ($4.200)', amount: 12000 },
      { id: 'oct_e_10', date: '2026-10-07', time: '23:24', operator: 'Jonatan', category: 'Descartables / Cajas', description: 'Cajas de pizza', amount: 12000 },
      { id: 'oct_e_11', date: '2026-10-07', time: '23:24', operator: 'Jonatan', category: 'Mercadería / Insumos', description: '7 bolsas de Papas fritas', amount: 31000 },
      { id: 'oct_e_12', date: '2026-10-07', time: '23:25', operator: 'Jonatan', category: 'Casa y Familia (Papá)', description: 'Galletitas para mami ($3.400) + rosquita/garrapiñadas ($3.400)', amount: 6800 },
      { id: 'oct_e_13', date: '2026-10-07', time: '23:26', operator: 'Jonatan', category: 'Consumo / Merma', description: '-2 pizzas', amount: 8000 },
      // 8/10 y 9/10
      { id: 'oct_e_14', date: '2026-10-08', time: '17:49', operator: 'Jonatan', category: 'Equipamiento y Local', description: 'Elástico para la heladera', amount: 23000 },
      { id: 'oct_e_15', date: '2026-10-08', time: '17:50', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Muzzarella (horma 5kg)', amount: 40000 },
      { id: 'oct_e_16', date: '2026-10-09', time: '02:16', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Lata salsa ($11.300), Bondiola 1,5kg ($11.000), Jamón ($2k), Verdura ($1.2k)', amount: 25500 },
      { id: 'oct_e_17', date: '2026-10-09', time: '02:17', operator: 'Jonatan', category: 'Consumo / Merma', description: 'Se perdieron como 14 empanadas', amount: 7000 },
      // 10/10
      { id: 'oct_e_18', date: '2026-10-10', time: '12:19', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Disco empanadas ($7.900) y Verdeo ($500)', amount: 8400 },
      { id: 'oct_e_19', date: '2026-10-10', time: '12:19', operator: 'Jonatan', category: 'Garrafa / Gas', description: 'Garrafa', amount: 26000 },
      { id: 'oct_e_20', date: '2026-10-10', time: '12:20', operator: 'Jonatan', category: 'Equipamiento y Local', description: 'Freidora nueva ($197.000) + 12 Trapos ($18.000)', amount: 215000 },
      { id: 'oct_e_21', date: '2026-10-10', time: '12:33', operator: 'Jonatan', category: 'Retiro Personal', description: 'Pizzas Jaqui ($30.000 aprox) + Cumple Santi ($3.000)', amount: 33000 },
      // 13/10, 14/10, 15/10
      { id: 'oct_e_22', date: '2026-10-13', time: '00:49', operator: 'Jonatan', category: 'Casa y Familia (Papá)', description: '60 a mami (aporte casa)', amount: 60000 },
      { id: 'oct_e_23', date: '2026-10-13', time: '00:50', operator: 'Jonatan', category: 'Pago a Heber', description: '25 Heber', amount: 25000 },
      { id: 'oct_e_24', date: '2026-10-14', time: '01:48', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Grasa ($2.600) + Lechuga, tomate y morrón ($3.900)', amount: 6500 },
      { id: 'oct_e_25', date: '2026-10-14', time: '01:49', operator: 'Jonatan', category: 'Consumo / Merma', description: '-2 Muzzas', amount: 10000 },
      { id: 'oct_e_26', date: '2026-10-14', time: '13:30', operator: 'Jonatan', category: 'Retiro Personal', description: 'Gasto en Once (~$60.000)', amount: 60000 },
      { id: 'oct_e_27', date: '2026-10-15', time: '02:33', operator: 'Jonatan', category: 'Garrafa / Gas', description: 'Garrafa', amount: 26000 },
      { id: 'oct_e_28', date: '2026-10-15', time: '23:28', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Muzza 10kg ($80.000), Carne picada ($20.000), Jamón y Verdura ($5.400)', amount: 105400 },
      // 17/10 y 18/10
      { id: 'oct_e_29', date: '2026-10-17', time: '23:55', operator: 'Jonatan', category: 'Pago a Heber', description: 'Heber turno viernes', amount: 12000 },
      { id: 'oct_e_30', date: '2026-10-17', time: '23:56', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Pan ($3.000), Jamón ($1.800), Cebolla/tomate/verdeo ($4.500), 2 emp ($2.000)', amount: 11300 },
      { id: 'oct_e_31', date: '2026-10-17', time: '23:57', operator: 'Jonatan', category: 'Descartables / Cajas', description: 'Detergente', amount: 2500 },
      { id: 'oct_e_32', date: '2026-10-18', time: '00:05', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Carne picada ($20k), Nalga ($17k), Pan ($5.8k), Grasa ($2.5k), Verdura ($8.8k)', amount: 54100 },
      { id: 'oct_e_33', date: '2026-10-18', time: '00:06', operator: 'Jonatan', category: 'Garrafa / Gas', description: 'Garrafa', amount: 26000 },
      { id: 'oct_e_34', date: '2026-10-18', time: '00:07', operator: 'Jonatan', category: 'Casa y Familia (Papá)', description: 'Cosas de casa', amount: 12000 },
      // 20/10, 21/10, 22/10, 23/10
      { id: 'oct_e_35', date: '2026-10-20', time: '17:38', operator: 'Jonatan', category: 'Pago a Heber', description: 'Heber', amount: 13000 },
      { id: 'oct_e_36', date: '2026-10-20', time: '17:39', operator: 'Benja', category: 'Retiro Personal', description: 'Retiro Benja', amount: 30000 },
      { id: 'oct_e_37', date: '2026-10-20', time: '19:20', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Coca 1.75 ($27k), Coca 600 ($9k), Placer ($16.8k), Disco emp ($7.9k), Verdura/Pan ($6.5k)', amount: 67200 },
      { id: 'oct_e_38', date: '2026-10-20', time: '19:22', operator: 'Jonatan', category: 'Descartables / Cajas', description: 'Servilletas', amount: 1900 },
      { id: 'oct_e_39', date: '2026-10-21', time: '18:37', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Pan hamb ($4.000), Verdura ($3.300), Pack Brahma ($11.000), Pack Placer ($5.600)', amount: 23900 },
      { id: 'oct_e_40', date: '2026-10-21', time: '18:40', operator: 'Jonatan', category: 'Retiro Personal', description: 'Salida personal ($20.000) + Helado con Jaqui ($5.000)', amount: 25000 },
      { id: 'oct_e_41', date: '2026-10-22', time: '11:18', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Harina + levadura + salsa', amount: 31800 },
      { id: 'oct_e_42', date: '2026-10-23', time: '13:15', operator: 'Jonatan', category: 'Mercadería / Insumos', description: '12 paquetes de hamburguesas ($26.000) + Lechuga y tomate ($1.400)', amount: 27400 },
      { id: 'oct_e_43', date: '2026-10-23', time: '13:16', operator: 'Jonatan', category: 'Casa y Familia (Papá)', description: 'Pepsi para casa ($4.000) + Galletitas ($2.500)', amount: 6500 },
      { id: 'oct_e_44', date: '2026-10-23', time: '13:17', operator: 'Benja', category: 'Retiro Personal', description: 'Retiro Benja', amount: 50000 },
      { id: 'oct_e_45', date: '2026-10-23', time: '22:31', operator: 'Jonatan', category: 'Descartables / Cajas', description: 'Cajas de pizza', amount: 13700 },
      // 25/10, 26/10, 27/10, 28/10
      { id: 'oct_e_46', date: '2026-10-25', time: '23:08', operator: 'Jonatan', category: 'Ofrenda Iglesia (Luz/Alquiler)', description: 'Ofrenda iglesia', amount: 100000 },
      { id: 'oct_e_47', date: '2026-10-25', time: '23:09', operator: 'Jonatan', category: 'Garrafa / Gas', description: 'Garrafa', amount: 26000 },
      { id: 'oct_e_48', date: '2026-10-25', time: '23:10', operator: 'Jonatan', category: 'Mercadería / Insumos', description: '2 Muzzas ($12.000), Pan ($7.000), Jamón ($4.500)', amount: 23500 },
      { id: 'oct_e_49', date: '2026-10-25', time: '23:11', operator: 'Jonatan', category: 'Descartables / Cajas', description: 'Rollo de cocina', amount: 1500 },
      { id: 'oct_e_50', date: '2026-10-26', time: '01:17', operator: 'Jonatan', category: 'Pago a Heber', description: 'Heber martes ($14.000) + Heber sábado y domingo ($28.000)', amount: 42000 },
      { id: 'oct_e_51', date: '2026-10-26', time: '01:18', operator: 'Jonatan', category: 'Consumo / Merma', description: '-7.000 empanadas', amount: 7000 },
      { id: 'oct_e_52', date: '2026-10-26', time: '20:05', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Carne picada 2kg ($20.000) + Nalga ($12.000)', amount: 32000 },
      { id: 'oct_e_53', date: '2026-10-26', time: '20:06', operator: 'Jonatan', category: 'Descartables / Cajas', description: 'Colorante+cinta ($7k), Bolsas docena y media ($5.8k), Papel ($4.5k)', amount: 17300 },
      { id: 'oct_e_54', date: '2026-10-26', time: '20:07', operator: 'Benja', category: 'Retiro Personal', description: 'Retiro Benja (80)', amount: 80000 },
      { id: 'oct_e_55', date: '2026-10-27', time: '22:13', operator: 'Jonatan', category: 'Pago a Heber', description: 'Heber turno martes', amount: 15000 },
      { id: 'oct_e_56', date: '2026-10-27', time: '22:14', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Brahma ($11k), Coca ($9k), Aceite ($17.5k), 2 Tapas emp ($15.4k), Huevos ($9k), Verdura ($5.2k)', amount: 67100 },
      { id: 'oct_e_57', date: '2026-10-28', time: '18:00', operator: 'Jonatan', category: 'Equipamiento y Local', description: 'Pintura verde para el local', amount: 33000 },
      { id: 'oct_e_58', date: '2026-10-28', time: '18:01', operator: 'Jonatan', category: 'Casa y Familia (Papá)', description: 'Jabón y cloro para mami', amount: 7000 },
      { id: 'oct_e_59', date: '2026-10-28', time: '19:22', operator: 'Jonatan', category: 'Garrafa / Gas', description: 'Garrafa', amount: 26000 }
    ],
    buyList: [
      { id: 'buy_1', text: 'Muzzarella 10kg ($80.000)', done: false, operator: 'Jonatan' },
      { id: 'buy_2', text: 'Tapas de empanada ($7.900) y Carne picada 2kg ($20.000)', done: false, operator: 'Benja' }
    ],
    todoList: [
      { id: 'todo_1', text: 'Amasar bollos para promo 3x$27.000', done: false, operator: 'Jonatan' },
      { id: 'todo_2', text: 'Armar empanadas y preparar milanesas', done: false, operator: 'Benja' }
    ]
  };
}

let state = loadState();
let currentOperator = 'Jonatan';
let currentPeriod = 'month';
let activeDate = getOffsetDateISO(0);
let activeCatFilter = 'all';
let draftCart = {};
let severHours = 4;
let severSelectedRate = 3750;

function loadState() {
  const initial = getInitialState();
  try {
    // Recover Gemini API key or Firebase URL from dedicated key or older storage versions
    let savedGeminiKey = localStorage.getItem('gastro_gemini_key') || '';
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
      initial.meta.firebaseUrl = savedFirebaseUrl;
      return initial;
    }
    const parsed = JSON.parse(raw);
    const merged = { ...initial, ...parsed, meta: { ...initial.meta, ...(parsed.meta || {}) } };
    if (savedGeminiKey && !merged.meta.geminiApiKey) merged.meta.geminiApiKey = savedGeminiKey;
    if (savedFirebaseUrl && !merged.meta.firebaseUrl) merged.meta.firebaseUrl = savedFirebaseUrl;
    return merged;
  } catch (e) {
    return initial;
  }
}

function saveState(pushCloud = true) {
  state.meta.lastUpdated = Date.now();
  if (state.meta.geminiApiKey !== undefined) {
    localStorage.setItem('gastro_gemini_key', state.meta.geminiApiKey);
  }
  if (state.meta.firebaseUrl !== undefined) {
    localStorage.setItem('gastro_firebase_url', state.meta.firebaseUrl);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (pushCloud && state.meta.firebaseUrl) {
    syncToFirebaseSilent();
  }
}

function showToast(msg) {
  const region = document.getElementById('toastRegion');
  const el = document.createElement('div');
  el.className = 'toast-banner';
  el.textContent = msg;
  region.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// ============================================================================
// COST & RECIPE ENGINE
// ============================================================================
function getIngredientById(ingId) {
  return state.ingredients.find(i => i.id === ingId);
}

function calculateProductCost(product) {
  if (!product.recipe || !product.recipe.length) return 0;
  return Math.round(
    product.recipe.reduce((acc, line) => {
      const ing = getIngredientById(line.ingId);
      const unitPrice = ing ? Number(ing.price) || 0 : 0;
      return acc + unitPrice * (Number(line.qty) || 0);
    }, 0)
  );
}

function getProductMarginPercent(product) {
  const cost = calculateProductCost(product);
  const price = Number(product.price) || 0;
  if (price <= 0) return 0;
  return Math.round(((price - cost) / price) * 100);
}

// ============================================================================
// PERIOD METRICS & RECONCILIATION ASSERTIONS
// ============================================================================
function isDateInPeriod(itemDateStr, period, refDateStr) {
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

function getMetricsForPeriod(period, refDateStr) {
  const salesInPeriod = state.sales.filter(s => isDateInPeriod(s.date, period, refDateStr));
  const expensesInPeriod = state.expenses.filter(e => isDateInPeriod(e.date, period, refDateStr));

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

// ============================================================================
// RENDER 1: HEADER FINDING, KPIS, BOLSILLOS TREE & SEVER CALCULATOR
// ============================================================================
function renderHeaderAndKpis() {
  const m = getMetricsForPeriod(currentPeriod, activeDate);
  const todayM = getMetricsForPeriod('today', activeDate);

  const periodNames = {
    today: `Fecha ${activeDate}`,
    week: `Últimos 7 días hasta ${activeDate}`,
    month: `Mes Octubre (${activeDate.slice(0, 7)})`
  };

  document.getElementById('ledgerPeriodLabel').textContent = periodNames[currentPeriod];

  // Lead Finding under H1
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

  // 4 KPIs in the 1px divided strip
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

  // Render Bolsillos & Church Tree in left column
  const monthM = getMetricsForPeriod('month', activeDate);
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

  // Render Heber Shift Calculator
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

// ============================================================================
// RENDER 2: TANDA BUILDER, WEEKLY CHART & TODAY'S MOVEMENTS TABLE
// ============================================================================
function renderOverviewRightColumn() {
  const grid = document.getElementById('productCounterGrid');
  grid.innerHTML = '';

  const prods = state.products.filter(p => {
    if (activeCatFilter === 'all') return true;
    if (activeCatFilter === 'Comida') return p.category === 'Pizzas' || p.category === 'Minutas' || p.id === 'prod_coca_175';
    return p.category === activeCatFilter;
  });

  prods.forEach(prod => {
    const unitCost = calculateProductCost(prod);
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
        <button type="button" class="step-btn" data-step-minus="${prod.id}" aria-label="Restar ${prod.name}">−</button>
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

function updateDraftBar() {
  const entries = Object.entries(draftCart).filter(([, q]) => q > 0);
  let totalItems = 0;
  let totalSale = 0;
  let totalCost = 0;

  entries.forEach(([prodId, qty]) => {
    const prod = state.products.find(p => p.id === prodId);
    if (!prod) return;
    const c = calculateProductCost(prod);
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

function renderWeeklyChart() {
  const chartEl = document.getElementById('weeklySalesChart');
  if (!chartEl || !window.Charts) return;

  // Group sales by date and take the last 7 active working jornadas
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

  Charts.bars(chartEl, {
    labels,
    values: valuesInThousands,
    highlight: Math.max(0, labels.length - 1),
    height: 310,
    reference: { value: 100, label: 'Meta $100k' },
    format: v => `$${v}k`,
    tickFormat: v => `$${v}k`
  });
}

function renderTodayMovementsTable() {
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

// ============================================================================
// RENDER 3: EXPENSES & CHURCH SHARED PLAN VIEW
// ============================================================================
function renderExpensesScreen() {
  // Populate ingredient selector in expense form
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

  const monthM = getMetricsForPeriod('month', activeDate);
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
    Charts.plan(
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

  // Category barList chart
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
      Charts.barList(barListEl, catRows, { format: v => formatARS(v) });
    } else {
      barListEl.innerHTML = `<div class="empty">Sin egresos registrados en este mes.</div>`;
    }
  }
}

// ============================================================================
// RENDER 4: INGREDIENTS & RECIPES COSTING TABLE
// ============================================================================
function renderCostsScreen() {
  const ingBody = document.getElementById('ingredientsTableBody');
  ingBody.innerHTML = '';

  state.ingredients.forEach(ing => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:500;">${ing.name}</td>
      <td><span class="pill">x ${ing.unit}</span></td>
      <td class="n">
        <input
          type="number"
          class="input num"
          style="width:110px; text-align:right; height:30px; margin-left:auto;"
          data-ing-input="${ing.id}"
          value="${ing.price}"
          min="0"
          step="any"
          aria-label="Precio de ${ing.name}"
        />
      </td>
    `;
    ingBody.appendChild(tr);
  });

  const prodBody = document.getElementById('productsCostTableBody');
  prodBody.innerHTML = '';

  state.products.forEach(prod => {
    const cost = calculateProductCost(prod);
    const profit = prod.price - cost;
    const margin = getProductMarginPercent(prod);
    const pillClass = margin >= 55 ? 'pos' : margin >= 40 ? 'warn' : 'neg';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span style="font-weight:500;">${prod.name}</span>
        <span class="sub">${prod.category}</span>
      </td>
      <td class="n">
        <input
          type="number"
          class="input num"
          style="width:105px; text-align:right; height:30px; margin-left:auto; font-weight:600;"
          data-prod-price-input="${prod.id}"
          value="${prod.price}"
          min="0"
          step="any"
          aria-label="Precio de venta de ${prod.name}"
        />
      </td>
      <td class="n num">${formatARS(cost)}</td>
      <td class="n money-bold num" style="color:var(--positive);">+${formatARS(profit)}</td>
      <td class="n"><span class="pill ${pillClass} num">${margin}%</span></td>
      <td class="n">
        <button type="button" class="btn btn-sm" data-edit-prod="${prod.id}">Receta</button>
      </td>
    `;
    prodBody.appendChild(tr);
  });
}

// ============================================================================
// RENDER 5: SHARED NOTES (BUY LIST & PRODUCTION TASKS)
// ============================================================================
function renderNotesScreen() {
  const pendingCount =
    state.buyList.filter(i => !i.done).length +
    state.todoList.filter(i => !i.done).length;
  const countBadge = document.getElementById('navPendingCount');
  countBadge.textContent = pendingCount;
  countBadge.hidden = pendingCount === 0;

  const buyEl = document.getElementById('buyRowsContainer');
  buyEl.innerHTML = '';
  if (state.buyList.length === 0) {
    buyEl.innerHTML = `<div class="empty">No hay insumos pendientes en la lista de compras.</div>`;
  } else {
    state.buyList.forEach(item => {
      const div = document.createElement('div');
      div.className = 'row';
      div.innerHTML = `
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; flex:1;">
          <input type="checkbox" data-toggle-buy="${item.id}" ${item.done ? 'checked' : ''} />
          <span style="${item.done ? 'text-decoration:line-through; color:var(--muted);' : 'font-weight:500;'}">${item.text}</span>
          <span class="meta">(${item.operator})</span>
        </label>
        <div style="display:flex; gap:6px;">
          ${
            !item.done
              ? `<button type="button" class="btn btn-sm" data-buy-to-expense="${item.id}">Pasar a gasto ($)</button>`
              : ''
          }
          <button type="button" class="btn btn-sm" data-del-buy="${item.id}">Borrar</button>
        </div>
      `;
      buyEl.appendChild(div);
    });
  }

  const todoEl = document.getElementById('todoRowsContainer');
  todoEl.innerHTML = '';
  if (state.todoList.length === 0) {
    todoEl.innerHTML = `<div class="empty">No hay tareas de producción pendientes.</div>`;
  } else {
    state.todoList.forEach(item => {
      const div = document.createElement('div');
      div.className = 'row';
      div.innerHTML = `
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; flex:1;">
          <input type="checkbox" data-toggle-todo="${item.id}" ${item.done ? 'checked' : ''} />
          <span style="${item.done ? 'text-decoration:line-through; color:var(--muted);' : 'font-weight:500;'}">${item.text}</span>
          <span class="meta">(${item.operator})</span>
        </label>
        <button type="button" class="btn btn-sm" data-del-todo="${item.id}">Borrar</button>
      `;
      todoEl.appendChild(div);
    });
  }
}

// ============================================================================
// RENDER 6: AI ADVISOR & CREDIT SIMULATOR
// ============================================================================
function renderAdvisorScreen() {
  const monthM = getMetricsForPeriod('month', activeDate);
  const ranked = [...state.products].sort(
    (a, b) => getProductMarginPercent(b) - getProductMarginPercent(a)
  );
  const best = ranked[0];
  const lowest = ranked[ranked.length - 1];

  const geminiBadge = document.getElementById('geminiStatusBadge');
  const geminiBtn = document.getElementById('btnSetGeminiKey');
  const hasKey = Boolean(state.meta.geminiApiKey && state.meta.geminiApiKey.trim());
  if (geminiBadge) {
    geminiBadge.textContent = hasKey ? 'Gemini IA: Conectado' : 'Modo local (Sin API Key)';
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
        <div class="meta">${best ? best.name : '-'} (Costo ${best ? formatARS(calculateProductCost(best)) : '$0'})</div>
      </div>
      <span class="pill pos num">${best ? getProductMarginPercent(best) : 0}%</span>
    </div>
    <div class="row">
      <div>
        <div style="font-weight:500;">Margen más ajustado a vigilar</div>
        <div class="meta">${lowest ? lowest.name : '-'} (Costo ${lowest ? formatARS(calculateProductCost(lowest)) : '$0'})</div>
      </div>
      <span class="pill warn num">${lowest ? getProductMarginPercent(lowest) : 0}%</span>
    </div>
  `;

  updateCreditVerdict();
}

function updateCreditVerdict() {
  const quota = Number(document.getElementById('inputSimQuota').value) || 0;
  const monthM = getMetricsForPeriod('month', activeDate);
  const estimatedMonthlyNet = Math.max(monthM.grossProfitAfterReplenishment - 650000, 680000);
  const safeThreshold = Math.round(estimatedMonthlyNet * 0.25);

  const box = document.getElementById('simVerdictBox');
  if (quota <= safeThreshold) {
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

function formatMarkdownToHtml(md) {
  return String(md || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\s*[\*\-]\s+(.+)$/gm, '• $1')
    .replace(/\n/g, '<br>');
}

async function askAdvisor(question) {
  const log = document.getElementById('advisorChatLog');

  const uDiv = document.createElement('div');
  uDiv.className = 'chat-entry user';
  uDiv.textContent = question;
  log.appendChild(uDiv);

  const aDiv = document.createElement('div');
  aDiv.className = 'chat-entry assistant';
  const rawKey = (state.meta.geminiApiKey || '').trim().replace(/^["']|["']$/g, '');
  aDiv.textContent = rawKey
    ? 'Consultando a Gemini IA con tus números de Octubre...'
    : 'Calculando sobre tus registros locales...';
  log.appendChild(aDiv);
  log.scrollTop = log.scrollHeight;

  const todayM = getMetricsForPeriod('today', activeDate);
  const weekM = getMetricsForPeriod('week', activeDate);
  const monthM = getMetricsForPeriod('month', activeDate);

  let geminiErrorNotice = '';

  if (rawKey) {
    // Build compact category breakdown for Gemini so the prompt is fast and exact
    const catTotals = {};
    monthM.expensesInPeriod.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount || 0);
    });

    const payload = {
      negocio: 'Local gastronómico de Jonatan y Benja (Pizzas, Empanadas fritas/horno, Sánguches de Bondiola y Milanesa, Hamburguesas, Papas y Bebidas). Empleado por turno: Heber.',
      fechaSeleccionada: {
        fecha: activeDate,
        vendidoBruto: todayM.grossSales,
        costoReposicion: todayM.cogsSold,
        gastosOperativos: todayM.operatingExpenses,
        saldoLibre: todayM.netFreeProfit
      },
      ultimos7Dias: {
        vendidoBruto: weekM.grossSales,
        costoReposicion: weekM.cogsSold,
        gastosOperativos: weekM.operatingExpenses,
        saldoLibre: weekM.netFreeProfit
      },
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
      costosInsumosActuales: state.ingredients.map(i => ({
        insumo: i.name,
        unidad: i.unit,
        costoARS: i.price
      })),
      cartaProductosYMargenes: state.products.map(p => ({
        producto: p.name,
        categoria: p.category,
        precioVentaARS: p.price,
        costoRecetaARS: calculateProductCost(p),
        gananciaLimpiaUnitariaARS: p.price - calculateProductCost(p),
        margenPorcentaje: getProductMarginPercent(p) + '%'
      }))
    };

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const modelName of modelsToTry) {
      try {
        const res = await fetch(
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
                        `Hablales en español rioplatense claro, directo y práctico (usá pesos argentinos con formato $XX.XXX). ` +
                        `Respondé su consulta usando exactamente los datos reales de su negocio en Octubre que están en este JSON: ${JSON.stringify(
                          payload
                        )}.\n\nConsulta del usuario: ${question}`
                    }
                  ]
                }
              ]
            })
          }
        );
        const data = await res.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (res.ok && reply) {
          aDiv.innerHTML =
            `<div style="margin-bottom:6px; display:flex; align-items:center; gap:6px;">` +
            `<span class="pill pos">Gemini IA (${modelName})</span>` +
            `</div>` +
            formatMarkdownToHtml(reply);
          log.scrollTop = log.scrollHeight;
          return;
        } else if (data?.error?.message) {
          geminiErrorNotice = data.error.message;
          // If the key itself is invalid, no need to retry other models
          if (
            geminiErrorNotice.toLowerCase().includes('api key not valid') ||
            geminiErrorNotice.toLowerCase().includes('api_key_invalid')
          ) {
            break;
          }
        }
      } catch (e) {
        geminiErrorNotice = 'Sin conexión a internet o bloqueo de red';
      }
    }
  }

  const prefixBadge = rawKey
    ? `<div style="margin-bottom:6px;"><span class="pill warn">No se pudo conectar a Gemini (${
        geminiErrorNotice || 'Verificá tu API Key'
      }) · Respuesta del motor local:</span></div>`
    : `<div style="margin-bottom:6px;"><span class="pill">Motor local (Configurá tu API Gemini arriba para respuestas abiertas con IA)</span></div>`;

  const q = question.toLowerCase();
  if (q.includes('rentable') || q.includes('ganancia') || q.includes('producto') || q.includes('margen')) {
    const byUnitProfit = [...state.products]
      .map(p => ({
        name: p.name,
        profit: p.price - calculateProductCost(p),
        pct: getProductMarginPercent(p)
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
    aDiv.innerHTML = `${prefixBadge}<strong>Mayor ganancia limpia por venta:</strong><br>${top}<br><br><strong>Margen más chico por unidad:</strong><br>${low}`;
  } else if (q.includes('muzzarella') || q.includes('15%') || q.includes('sube') || q.includes('aument')) {
    const muzza = getIngredientById('ing_muzza');
    const currentPrice = muzza ? muzza.price : 8000;
    const nextPrice = Math.round(currentPrice * 1.15);
    const diffPerPizza = Math.round((nextPrice - currentPrice) * 0.3);
    aDiv.innerHTML = `${prefixBadge}Si la muzzarella sube 15% (de ${formatARS(currentPrice)} a ${formatARS(
      nextPrice
    )}/kg), el costo de cada Pizza Muzzarella sube <strong>+${formatARS(
      diffPerPizza
    )}</strong>. Para sostener tu margen del 63%, te conviene ajustar la Pizza Muzzarella de $10.000 a <strong>${formatARS(
      10000 + Math.ceil((diffPerPizza * 2.5) / 500) * 500
    )}</strong> y la Promo 3x$27.000 a <strong>${formatARS(
      27000 + Math.ceil((diffPerPizza * 3 * 2.5) / 1000) * 1000
    )}</strong>.`;
  } else if (q.includes('iglesia') || q.includes('alquiler') || q.includes('luz') || q.includes('heber') || q.includes('sever') || q.includes('casa') || q.includes('mami')) {
    const light = monthM.expensesInPeriod
      .filter(e => e.category === 'Luz' || e.category === 'Ofrenda Iglesia (Luz/Alquiler)')
      .reduce((s, e) => s + Number(e.amount), 0);
    const heber = monthM.expensesInPeriod
      .filter(e => e.category === 'Pago a Heber' || e.category === 'Pago a Sever')
      .reduce((s, e) => s + Number(e.amount), 0);
    const gas = monthM.expensesInPeriod
      .filter(e => e.category === 'Garrafa / Gas')
      .reduce((s, e) => s + Number(e.amount), 0);
    aDiv.innerHTML = `${prefixBadge}<strong>Balance acumulado de Octubre:</strong><br>• Ofrenda Iglesia / Luz / Alquiler: <strong>${formatARS(
      light
    )}</strong><br>• Casa y Familia (Mami / Papá): <strong>${formatARS(
      monthM.familySupport
    )}</strong><br>• Turnos pagados a Heber: <strong>${formatARS(
      heber
    )}</strong><br>• 6 Garrafas de gas: <strong>${formatARS(gas)}</strong>`;
  } else {
    const equip = monthM.expensesInPeriod
      .filter(e => e.category === 'Equipamiento y Local')
      .reduce((s, e) => s + Number(e.amount), 0);
    const retiros = monthM.expensesInPeriod
      .filter(e => e.category === 'Retiro Personal')
      .reduce((s, e) => s + Number(e.amount), 0);
    aDiv.innerHTML = `${prefixBadge}<strong>Diagnóstico de Octubre (24 cierres):</strong><br>• Vendido bruto: <strong>${formatARS(
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

  log.scrollTop = log.scrollHeight;
}

// ============================================================================
// CLOUD SYNC
// ============================================================================
async function syncToFirebaseSilent() {
  if (!state.meta.firebaseUrl) return;
  const url = state.meta.firebaseUrl.replace(/\/$/, '') + '/gastro_caja_v2.json';
  try {
    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
  } catch (e) {
    // Offline fallback stays in localStorage
  }
}

async function pullFromFirebase() {
  if (!state.meta.firebaseUrl) {
    showToast('Ingresá primero la URL de Firebase');
    return;
  }
  const url = state.meta.firebaseUrl.replace(/\/$/, '') + '/gastro_caja_v2.json';
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.products) {
      state = { ...getInitialState(), ...data };
      saveState(false);
      renderAll();
      showToast('Datos sincronizados desde la nube');
    } else {
      await syncToFirebaseSilent();
      showToast('Nube inicializada con tus datos actuales');
    }
  } catch (e) {
    showToast('No se pudo conectar con la URL indicada');
  }
}

// ============================================================================
// MASTER RENDER & EVENTS
// ============================================================================
function renderAll() {
  renderHeaderAndKpis();
  renderOverviewRightColumn();
  renderExpensesScreen();
  renderCostsScreen();
  renderNotesScreen();
  renderAdvisorScreen();
}

function setupEvents() {
  // Date selector
  const dateInput = document.getElementById('activeDateInput');
  dateInput.value = activeDate;
  dateInput.addEventListener('change', e => {
    if (e.target.value) {
      activeDate = e.target.value;
      renderAll();
    }
  });

  // Mobile menu
  const sidebar = document.getElementById('appSidebar');
  const closeBtn = document.getElementById('btnMobileMenuClose');
  document.getElementById('btnMobileMenuOpen').addEventListener('click', () => {
    sidebar.classList.add('open');
    closeBtn.style.display = 'inline-flex';
  });
  closeBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
    closeBtn.style.display = 'none';
  });

  // Navigation items
  const screenTitles = {
    'screen-overview': 'Caja y tandas del día',
    'screen-expenses': 'Gastos, alquiler y aportes a la iglesia',
    'screen-costs': 'Insumos variables y costeo de recetas',
    'screen-notes': 'Lista de compras y tareas de producción',
    'screen-advisor': 'Consultor financiero y simulador de cuotas'
  };

  document.querySelectorAll('.nav-item[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.screen;
      document.querySelectorAll('.nav-item[data-screen]').forEach(b => {
        if (b === btn) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
      });
      document.querySelectorAll('.screen-view').forEach(s => {
        s.hidden = s.id !== target;
      });
      document.getElementById('screenTitle').textContent = screenTitles[target] || 'Caja y tandas';
      sidebar.classList.remove('open');
      closeBtn.style.display = 'none';
      renderAll();
    });
  });

  // Operator switch
  document.querySelectorAll('.op-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentOperator = btn.dataset.operator;
      document.getElementById('activeOperatorBadge').textContent = currentOperator;
      document.querySelectorAll('.op-switch-btn').forEach(b => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      showToast(`Operador activo: ${currentOperator}`);
    });
  });

  // Period buttons
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPeriod = btn.dataset.period;
      document.querySelectorAll('.period-btn').forEach(b => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      renderHeaderAndKpis();
      renderTodayMovementsTable();
    });
  });

  // Category filter in Tanda builder
  document.querySelectorAll('.cat-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCatFilter = btn.dataset.cat;
      document.querySelectorAll('.cat-filter-btn').forEach(b => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      renderOverviewRightColumn();
    });
  });

  // Product counter clicks
  document.getElementById('productCounterGrid').addEventListener('click', e => {
    const rowTap = e.target.closest('[data-tap-row]');
    const plusBtn = e.target.closest('[data-step-plus]');
    const minusBtn = e.target.closest('[data-step-minus]');

    if (rowTap || plusBtn) {
      const id = (rowTap || plusBtn).dataset.tapRow || (rowTap || plusBtn).dataset.stepPlus;
      draftCart[id] = (draftCart[id] || 0) + 1;
      renderOverviewRightColumn();
    } else if (minusBtn) {
      const id = minusBtn.dataset.stepMinus;
      if ((draftCart[id] || 0) > 0) {
        draftCart[id] -= 1;
        if (draftCart[id] <= 0) delete draftCart[id];
        renderOverviewRightColumn();
      }
    }
  });

  document.getElementById('btnResetDraft').addEventListener('click', () => {
    draftCart = {};
    renderOverviewRightColumn();
  });

  document.getElementById('btnSaveTanda').addEventListener('click', () => {
    const entries = Object.entries(draftCart).filter(([, q]) => q > 0);
    if (!entries.length) return;

    let totalSale = 0;
    let totalCost = 0;
    const items = [];

    entries.forEach(([prodId, qty]) => {
      const prod = state.products.find(p => p.id === prodId);
      if (!prod) return;
      const unitCost = calculateProductCost(prod);
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
    state.sales.push({
      id: 'sale_' + Date.now(),
      date: activeDate,
      time: getCurrentTimeHHMM(),
      operator: currentOperator,
      note: noteEl.value.trim(),
      totalSale,
      totalCost,
      items
    });

    draftCart = {};
    noteEl.value = '';
    saveState();
    renderAll();
    showToast(`Tanda registrada por ${formatARS(totalSale)}`);
  });

  // Delete movement
  document.getElementById('todayMovementsTableBody').addEventListener('click', e => {
    const delSale = e.target.closest('[data-del-sale]');
    const delExp = e.target.closest('[data-del-exp]');
    if (delSale) {
      state.sales = state.sales.filter(s => s.id !== delSale.dataset.delSale);
      saveState();
      renderAll();
      showToast('Tanda eliminada');
    } else if (delExp) {
      state.expenses = state.expenses.filter(x => x.id !== delExp.dataset.delExp);
      saveState();
      renderAll();
      showToast('Egreso eliminado');
    }
  });

  // Heber controls
  document.getElementById('btnSeverMinus').addEventListener('click', () => {
    if (severHours > 1) {
      severHours -= 0.5;
      renderHeaderAndKpis();
    }
  });
  document.getElementById('btnSeverPlus').addEventListener('click', () => {
    severHours += 0.5;
    renderHeaderAndKpis();
  });
  document.querySelectorAll('#severRatesBar .rate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      severSelectedRate = Number(btn.dataset.rate);
      renderHeaderAndKpis();
    });
  });
  document.getElementById('btnCommitSeverPay').addEventListener('click', () => {
    const amount = Math.round(severHours * severSelectedRate);
    state.expenses.push({
      id: 'exp_' + Date.now(),
      date: activeDate,
      time: getCurrentTimeHHMM(),
      operator: currentOperator,
      category: 'Pago a Heber',
      description: `Turno Heber (${severHours} hs a ${formatARS(severSelectedRate)}/h)`,
      amount
    });
    saveState();
    renderAll();
    showToast(`Pago a Heber registrado: ${formatARS(amount)}`);
  });

  // Copy WhatsApp summary
  document.getElementById('btnCopyWhatsapp').addEventListener('click', () => {
    const m = getMetricsForPeriod('today', activeDate);
    const msg =
      `CIERRE DEL DIA (${activeDate})\n` +
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

  // 1-Line Quick Smart Expense Bar in Overview (#formQuickSmartExpense)
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

    // Multi-line paste directly from WhatsApp chat
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
            state.expenses.push({
              id: 'exp_' + Date.now() + '_' + idx,
              date: activeDate,
              time: getCurrentTimeHHMM(),
              operator: currentOperator,
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
          renderAll();
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

      state.expenses.push({
        id: 'exp_' + Date.now(),
        date: activeDate,
        time: getCurrentTimeHHMM(),
        operator: currentOperator,
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
      renderAll();
      showToast(`Clasificado en ${parsed.category}: ${formatARS(finalAmount)}`);
    });
  }

  // Live auto-classification in full Expense Form (#expDesc -> #expCategory + #expIngSelect)
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

  // Expense form & quick church buttons
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

    state.expenses.push({
      id: 'exp_' + Date.now(),
      date: activeDate,
      time: getCurrentTimeHHMM(),
      operator: currentOperator,
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
    renderAll();
    showToast(`Gasto guardado en ${category}`);
  });

  document.querySelectorAll('[data-quick-exp]').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.quickExp;
      const amount = Number(btn.dataset.amount) || 0;
      state.expenses.push({
        id: 'exp_' + Date.now(),
        date: activeDate,
        time: getCurrentTimeHHMM(),
        operator: currentOperator,
        category,
        description: `${category} (registro rápido)`,
        amount
      });
      saveState();
      renderAll();
      showToast(`Registrado: ${formatARS(amount)} en ${category}`);
    });
  });

  document.getElementById('btnEditChurchTargets').addEventListener('click', () => {
    const r = prompt('Meta mensual de aporte de Alquiler ($):', state.meta.rentMyGoal);
    if (r !== null && !isNaN(Number(r))) state.meta.rentMyGoal = Number(r);
    const l = prompt('Meta mensual de aporte de Luz y Ofrendas ($):', state.meta.lightMyGoal);
    if (l !== null && !isNaN(Number(l))) state.meta.lightMyGoal = Number(l);
    saveState();
    renderAll();
  });

  // Ingredients direct price update
  document.getElementById('ingredientsTableBody').addEventListener('change', e => {
    const input = e.target.closest('[data-ing-input]');
    if (!input) return;
    const ing = getIngredientById(input.dataset.ingInput);
    if (ing) {
      ing.price = Math.max(0, Number(input.value) || 0);
      saveState();
      renderAll();
      showToast(`Costo de ${ing.name} actualizado`);
    }
  });

  document.getElementById('btnNewIngredient').addEventListener('click', () => {
    const name = prompt('Nombre del insumo:');
    if (!name) return;
    const unit = prompt('Unidad (kg, litro, unid):', 'kg') || 'unid';
    const price = Number(prompt(`Costo actual por ${unit} ($):`, '2500')) || 0;
    state.ingredients.push({
      id: 'ing_' + Date.now(),
      name: name.trim(),
      unit: unit.trim(),
      price
    });
    saveState();
    renderAll();
  });

  // Product & Recipe modal + inline selling price update
  document.getElementById('productsCostTableBody').addEventListener('change', e => {
    const priceInput = e.target.closest('[data-prod-price-input]');
    if (!priceInput) return;
    const prod = state.products.find(p => p.id === priceInput.dataset.prodPriceInput);
    if (prod) {
      prod.price = Math.max(0, Number(priceInput.value) || 0);
      saveState();
      renderAll();
      showToast(`Precio de ${prod.name} actualizado a ${formatARS(prod.price)}`);
    }
  });

  document.getElementById('productsCostTableBody').addEventListener('click', e => {
    const btn = e.target.closest('[data-edit-prod]');
    if (btn) openProductModal(btn.dataset.editProd);
  });
  document.getElementById('btnOpenNewProduct').addEventListener('click', () => openProductModal(null));
  document.getElementById('btnCloseProductModal').addEventListener('click', closeProductModal);
  document.getElementById('btnCancelProductModal').addEventListener('click', closeProductModal);
  document.getElementById('btnAddRecipeRow').addEventListener('click', () => {
    addRecipeRowElement(state.ingredients[0]?.id || '', 1);
    recalcModalRecipeCost();
  });
  document.getElementById('modalRecipeRows').addEventListener('input', recalcModalRecipeCost);
  document.getElementById('modalRecipeRows').addEventListener('click', e => {
    const rm = e.target.closest('[data-rm-recipe-row]');
    if (rm) {
      rm.closest('.recipe-line').remove();
      recalcModalRecipeCost();
    }
  });

  document.getElementById('formProductModal').addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('modalProdId').value;
    const name = document.getElementById('modalProdName').value.trim();
    const category = document.getElementById('modalProdCat').value;
    const price = Number(document.getElementById('modalProdPrice').value) || 0;
    const recipe = [];
    document.querySelectorAll('#modalRecipeRows .recipe-line').forEach(line => {
      const ingId = line.querySelector('select').value;
      const qty = Number(line.querySelector('input').value) || 0;
      if (ingId && qty > 0) recipe.push({ ingId, qty });
    });

    if (id) {
      const prod = state.products.find(p => p.id === id);
      if (prod) {
        prod.name = name;
        prod.category = category;
        prod.price = price;
        prod.recipe = recipe;
      }
    } else {
      state.products.push({
        id: 'prod_' + Date.now(),
        name,
        category,
        price,
        recipe
      });
      activeCatFilter = 'all';
      document.querySelectorAll('.cat-filter-btn').forEach(b => {
        b.setAttribute('aria-pressed', String(b.dataset.cat === 'all'));
      });
    }
    saveState();
    closeProductModal();
    renderAll();
    showToast('Producto guardado y visible en el inicio');
  });

  document.getElementById('btnDeleteProduct').addEventListener('click', () => {
    const id = document.getElementById('modalProdId').value;
    if (!id) return;
    state.products = state.products.filter(p => p.id !== id);
    saveState();
    closeProductModal();
    renderAll();
  });

  // Notes (Buy & Todo)
  document.getElementById('formAddBuy').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('inputBuyText');
    if (!input.value.trim()) return;
    state.buyList.unshift({
      id: 'buy_' + Date.now(),
      text: input.value.trim(),
      done: false,
      operator: currentOperator
    });
    input.value = '';
    saveState();
    renderNotesScreen();
  });

  document.getElementById('formAddTodo').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('inputTodoText');
    if (!input.value.trim()) return;
    state.todoList.unshift({
      id: 'todo_' + Date.now(),
      text: input.value.trim(),
      done: false,
      operator: currentOperator
    });
    input.value = '';
    saveState();
    renderNotesScreen();
  });

  document.getElementById('buyRowsContainer').addEventListener('click', e => {
    const toggle = e.target.closest('[data-toggle-buy]');
    const toExp = e.target.closest('[data-buy-to-expense]');
    const del = e.target.closest('[data-del-buy]');

    if (toExp) {
      const item = state.buyList.find(x => x.id === toExp.dataset.buyToExpense);
      if (!item) return;
      const val = Number(prompt(`Monto pagado por "${item.text}" ($):`, ''));
      if (val > 0) {
        item.done = true;
        const parsed = classifyExpenseText(item.text);
        state.expenses.push({
          id: 'exp_' + Date.now(),
          date: activeDate,
          time: getCurrentTimeHHMM(),
          operator: currentOperator,
          category: parsed.category,
          description: item.text,
          amount: Math.round(val)
        });
        saveState();
        renderAll();
        showToast(`Compra registrada en ${parsed.category}`);
      }
    } else if (del) {
      state.buyList = state.buyList.filter(x => x.id !== del.dataset.delBuy);
      saveState();
      renderNotesScreen();
    } else if (toggle) {
      const item = state.buyList.find(x => x.id === toggle.dataset.toggleBuy);
      if (item) {
        item.done = !item.done;
        saveState();
        renderNotesScreen();
      }
    }
  });

  document.getElementById('todoRowsContainer').addEventListener('click', e => {
    const toggle = e.target.closest('[data-toggle-todo]');
    const del = e.target.closest('[data-del-todo]');
    if (del) {
      state.todoList = state.todoList.filter(x => x.id !== del.dataset.delTodo);
      saveState();
      renderNotesScreen();
    } else if (toggle) {
      const item = state.todoList.find(x => x.id === toggle.dataset.toggleTodo);
      if (item) {
        item.done = !item.done;
        saveState();
        renderNotesScreen();
      }
    }
  });

  // Advisor & Simulator
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
  document.getElementById('btnSetGeminiKey').addEventListener('click', () => {
    const k = prompt('Pegá tu API Key de Google Gemini (de Google AI Studio, empieza con AIza...):', state.meta.geminiApiKey || '');
    if (k !== null) {
      state.meta.geminiApiKey = k.trim().replace(/^["']|["']$/g, '');
      saveState();
      renderAdvisorScreen();
      if (state.meta.geminiApiKey) {
        showToast('API Key guardada · Probando conexión con Gemini IA...');
        askAdvisor('Haceme un diagnóstico rápido de nuestro mes de Octubre y decime un consejo concreto para mejorar nuestra ganancia libre.');
      } else {
        showToast('Motor local activo (sin API Key)');
      }
    }
  });

  // Sync Modal
  const openSync = () => {
    document.getElementById('inputFirebaseUrl').value = state.meta.firebaseUrl || '';
    document.getElementById('modalSync').hidden = false;
  };
  document.getElementById('btnOpenSyncModal').addEventListener('click', openSync);
  document.getElementById('btnMobileSync').addEventListener('click', openSync);
  document.getElementById('btnCloseSyncModal').addEventListener('click', () => {
    document.getElementById('modalSync').hidden = true;
  });
  document.getElementById('btnSaveFirebase').addEventListener('click', async () => {
    state.meta.firebaseUrl = document.getElementById('inputFirebaseUrl').value.trim();
    saveState(false);
    await pullFromFirebase();
  });
  document.getElementById('btnSyncPush').addEventListener('click', async () => {
    await syncToFirebaseSilent();
    showToast('Datos enviados a la nube');
  });
  document.getElementById('btnSyncPull').addEventListener('click', pullFromFirebase);

  document.getElementById('btnExportBackup').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo-caja-cocina-${activeDate}.json`;
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
          state = { ...getInitialState(), ...parsed };
          saveState();
          renderAll();
          document.getElementById('modalSync').hidden = true;
          showToast('Respaldo restaurado');
        }
      } catch (err) {
        showToast('Archivo inválido');
      }
    };
    r.readAsText(f);
  });

  window.addEventListener('resize', () => {
    renderWeeklyChart();
    renderExpensesScreen();
  });
}

function openProductModal(prodId) {
  const modal = document.getElementById('modalProduct');
  const rows = document.getElementById('modalRecipeRows');
  rows.innerHTML = '';

  const prod = state.products.find(p => p.id === prodId);
  if (prod) {
    document.getElementById('modalProductTitle').textContent = `Receta: ${prod.name}`;
    document.getElementById('modalProdId').value = prod.id;
    document.getElementById('modalProdName').value = prod.name;
    document.getElementById('modalProdCat').value = prod.category;
    document.getElementById('modalProdPrice').value = prod.price;
    document.getElementById('btnDeleteProduct').hidden = false;
    (prod.recipe || []).forEach(r => addRecipeRowElement(r.ingId, r.qty));
  } else {
    document.getElementById('modalProductTitle').textContent = 'Nuevo producto';
    document.getElementById('modalProdId').value = '';
    document.getElementById('modalProdName').value = '';
    document.getElementById('modalProdCat').value = 'Pizzas';
    document.getElementById('modalProdPrice').value = 8500;
    document.getElementById('btnDeleteProduct').hidden = true;
    addRecipeRowElement(state.ingredients[0]?.id || '', 1);
  }
  recalcModalRecipeCost();
  modal.hidden = false;
}

function closeProductModal() {
  document.getElementById('modalProduct').hidden = true;
}

function addRecipeRowElement(ingId, qty) {
  const container = document.getElementById('modalRecipeRows');
  const div = document.createElement('div');
  div.className = 'recipe-line';
  const opts = state.ingredients
    .map(
      i =>
        `<option value="${i.id}" ${i.id === ingId ? 'selected' : ''}>${i.name} (${formatARS(i.price)}/${
          i.unit
        })</option>`
    )
    .join('');
  div.innerHTML = `
    <select class="input">${opts}</select>
    <input type="number" class="input num" step="any" min="0" value="${qty}" />
    <button type="button" class="btn btn-sm" data-rm-recipe-row="1">X</button>
  `;
  container.appendChild(div);
}

function recalcModalRecipeCost() {
  let sum = 0;
  document.querySelectorAll('#modalRecipeRows .recipe-line').forEach(line => {
    const ingId = line.querySelector('select').value;
    const qty = Number(line.querySelector('input').value) || 0;
    const ing = getIngredientById(ingId);
    if (ing) sum += (Number(ing.price) || 0) * qty;
  });
  document.getElementById('modalRecipeCostPreview').textContent = formatARS(sum);
}

document.addEventListener('DOMContentLoaded', () => {
  setupEvents();
  renderAll();
  askAdvisor('¿Qué productos me dejan más y menos ganancia hoy?');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  window.addEventListener('offline', () => {
    showToast('Modo sin señal activo: todo se guarda en este dispositivo');
  });

  window.addEventListener('online', () => {
    showToast('Conexión recuperada: datos listos');
    if (state.meta.firebaseUrl) {
      syncToFirebaseSilent();
    }
  });
});
