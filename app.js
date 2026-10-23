// Caja & Cocina — Libro Mayor Gastronómico
// Implementación alineada con taste-skill (achromatic-ledger), impeccable y ui-ux-pro-max

const STORAGE_KEY = 'gastro_caja_ledger_v3';

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
// SMART EXPENSE AUTO-CLASSIFIER (Keywords + Amount + Ingredient Qty Parser)
// ============================================================================
function classifyExpenseText(rawInput) {
  const raw = String(rawInput || '').trim();
  if (!raw) {
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

  // 1. Detect quantity with unit (e.g. "10kg", "5 kg", "4l") so we don't confuse it with money
  let detectedQty = 0;
  let textWithoutQty = norm;
  const qtyMatch = norm.match(/\b(\d+(?:[.,]\d+)?)\s*(kg|kilos?|litros?|lts?|unid|u|hormas?)\b/i);
  if (qtyMatch) {
    detectedQty = parseFloat(qtyMatch[1].replace(',', '.')) || 0;
    textWithoutQty = norm.replace(qtyMatch[0], ' ');
  }

  // 2. Detect money amount (e.g. "15000", "$15.000", "15k", "18.5k")
  let amount = 0;
  let rawMoneyToken = '';
  const kMatch = textWithoutQty.match(/(?:\$\s*)?\b(\d+(?:[.,]\d+)?)\s*k\b/i);
  if (kMatch) {
    amount = Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1000);
    rawMoneyToken = kMatch[0];
  } else {
    const numMatches = [...textWithoutQty.matchAll(/(?:\$\s*)?\b(\d{1,3}(?:\.\d{3})+|\d{3,7})\b/g)];
    if (numMatches.length > 0) {
      rawMoneyToken = numMatches[0][0];
      const digitsOnly = numMatches[0][1].replace(/\./g, '');
      amount = parseInt(digitsOnly, 10) || 0;
    }
  }

  // 3. Clean description (strip standalone money token from start/end)
  let cleanDesc = raw;
  if (rawMoneyToken) {
    const escaped = rawMoneyToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const stripped = raw
      .replace(new RegExp(`^\\s*\\$?\\s*${escaped}\\s*[-:·]?\\s*`, 'i'), '')
      .replace(new RegExp(`\\s*[-:·]?\\s*\\$?\\s*${escaped}\\s*$`, 'i'), '')
      .trim();
    if (stripped) cleanDesc = stripped;
  }
  if (cleanDesc) {
    cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
  }

  // 4. Deduce Category & Ingredient match
  let category = 'Mercadería / Insumos';
  let matchedRule = false;
  let ingId = '';

  const hasDadAccent = lowerRaw.includes('papá');
  const hasPotatoContext = /\b(frita|fritas|bolsa|cajon|kg|kilo|kilos|pelar|bastones)\b/.test(norm);
  const hasFamilyWords =
    /\b(remedio|remedios|farmacia|medico|operacion|clinica|hospital|salud|casa|familia|mama|supermercado|super|almacen|aporte casa|para casa|comida casa)\b/.test(
      norm
    );

  if (hasDadAccent || hasFamilyWords || (/\bpapa\b/.test(norm) && !hasPotatoContext)) {
    category = 'Casa y Familia (Papá)';
    matchedRule = true;
  } else if (/\b(sever|ayudante|empleado|jornal|sueldo sever|turno sever)\b/.test(norm)) {
    category = 'Pago a Sever';
    matchedRule = true;
  } else if (/\b(garrafa|garrafas|gas|tubo|envase)\b/.test(norm)) {
    category = 'Garrafa / Gas';
    matchedRule = true;
  } else if (/\b(ofrenda|ofrendas|iglesia|diezmo|culto|templo|pastor)\b/.test(norm)) {
    category = 'Ofrenda Iglesia (Luz/Alquiler)';
    matchedRule = true;
  } else if (/\b(alquiler|renta|locacion|inmobiliaria)\b/.test(norm)) {
    category = 'Alquiler';
    matchedRule = true;
  } else if (/\b(luz|edenor|edesur|electricidad|boleta luz|energia)\b/.test(norm)) {
    category = 'Luz';
    matchedRule = true;
  } else if (/\b(caja|cajas|bolsa|bolsas|papel|bandeja|bandejas|servilleta|descartable|descartables|film)\b/.test(norm)) {
    category = 'Descartables / Cajas';
    matchedRule = true;
    ingId = 'ing_caja';
  } else if (/\b(retiro|personal|mio|benja|jonatan)\b/.test(norm)) {
    category = 'Retiro Personal';
    matchedRule = true;
  }

  // Specific ingredient matching (also sets Mercadería / Insumos if not already matched)
  const ingKeywords = [
    { id: 'ing_muzza', rx: /\b(muzza|muzzarella|muzarela|queso|horma)\b/ },
    { id: 'ing_jamon', rx: /\b(jamon|paleta|fiambre)\b/ },
    { id: 'ing_morron', rx: /\b(morron|morrones|pimiento)\b/ },
    { id: 'ing_tomate', rx: /\b(tomate|tomates|triturado|pure)\b/ },
    { id: 'ing_papa', rx: /\b(papa|papas)\b/ },
    { id: 'ing_aceite', rx: /\b(aceite|grasa|freir)\b/ },
    { id: 'ing_empanada_u', rx: /\b(empanada|empanadas|tapa|tapas)\b/ },
    { id: 'ing_medallon', rx: /\b(medallon|medallones|paty|hamburguesa|picada)\b/ },
    { id: 'ing_pan', rx: /\b(pan|panes|figazza|pebete)\b/ },
    { id: 'ing_milanesa', rx: /\b(milanesa|milanesas|mila|nalga|peceto)\b/ },
    { id: 'ing_bondiola', rx: /\b(bondiola|cerdo)\b/ },
    { id: 'ing_masa', rx: /\b(harina|levadura|bollo|bollos|masa)\b/ },
    { id: 'ing_coca', rx: /\b(coca|cocacola)\b/ },
    { id: 'ing_sprite', rx: /\b(sprite)\b/ },
    { id: 'ing_manaos', rx: /\b(manaos)\b/ },
    { id: 'ing_placer', rx: /\b(placer)\b/ },
    { id: 'ing_agua', rx: /\b(agua)\b/ }
  ];

  if (category !== 'Casa y Familia (Papá)') {
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

  if (
    !matchedRule &&
    /\b(mercaderia|insumo|insumos|mayorista|proveedor|bebida|bebidas|gaseosa|gaseosas|carne|verdura)\b/.test(norm)
  ) {
    category = 'Mercadería / Insumos';
    matchedRule = true;
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
  const d0 = getOffsetDateISO(0);
  const d1 = getOffsetDateISO(1);
  const d2 = getOffsetDateISO(2);
  const d3 = getOffsetDateISO(3);
  const d4 = getOffsetDateISO(4);
  const d5 = getOffsetDateISO(5);
  const d6 = getOffsetDateISO(6);

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
      { id: 'ing_muzza', name: 'Muzzarella', unit: 'kg', price: 4200 },
      { id: 'ing_masa', name: 'Bollo de pizza y salsa', unit: 'unid', price: 950 },
      { id: 'ing_jamon', name: 'Jamón cocido', unit: 'kg', price: 6800 },
      { id: 'ing_morron', name: 'Morrón en conserva', unit: 'kg', price: 4500 },
      { id: 'ing_tomate', name: 'Tomate fresco', unit: 'kg', price: 2200 },
      { id: 'ing_papa', name: 'Papa fresca', unit: 'kg', price: 1100 },
      { id: 'ing_aceite', name: 'Aceite para freír', unit: 'litro', price: 2400 },
      { id: 'ing_empanada_u', name: 'Empanada cruda armada', unit: 'unid', price: 420 },
      { id: 'ing_medallon', name: 'Medallón carne y aderezos', unit: 'unid', price: 1450 },
      { id: 'ing_pan', name: 'Pan de sánguche o hamburguesa', unit: 'unid', price: 550 },
      { id: 'ing_milanesa', name: 'Milanesa preparada', unit: 'unid', price: 2300 },
      { id: 'ing_bondiola', name: 'Bondiola braseada', unit: 'kg', price: 8500 },
      { id: 'ing_caja', name: 'Caja o papel térmico', unit: 'unid', price: 350 },
      { id: 'ing_coca', name: 'Coca-Cola (costo)', unit: 'unid', price: 1850 },
      { id: 'ing_sprite', name: 'Sprite (costo)', unit: 'unid', price: 1850 },
      { id: 'ing_manaos', name: 'Manaos (costo)', unit: 'unid', price: 1250 },
      { id: 'ing_placer', name: 'Agua Placer (costo)', unit: 'unid', price: 1100 },
      { id: 'ing_agua', name: 'Agua mineral (costo)', unit: 'unid', price: 850 }
    ],
    products: [
      {
        id: 'prod_muzza',
        name: 'Pizza Muzzarella',
        category: 'Pizzas',
        price: 8500,
        recipe: [
          { ingId: 'ing_masa', qty: 1 },
          { ingId: 'ing_muzza', qty: 0.32 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_doble_muzza',
        name: 'Pizza Doble Muzza',
        category: 'Pizzas',
        price: 10800,
        recipe: [
          { ingId: 'ing_masa', qty: 1 },
          { ingId: 'ing_muzza', qty: 0.55 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_muzza_papas',
        name: 'Pizza Muzza con Papas',
        category: 'Pizzas',
        price: 10500,
        recipe: [
          { ingId: 'ing_masa', qty: 1 },
          { ingId: 'ing_muzza', qty: 0.30 },
          { ingId: 'ing_papa', qty: 0.45 },
          { ingId: 'ing_aceite', qty: 0.08 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_jamon',
        name: 'Pizza Jamón',
        category: 'Pizzas',
        price: 9800,
        recipe: [
          { ingId: 'ing_masa', qty: 1 },
          { ingId: 'ing_muzza', qty: 0.30 },
          { ingId: 'ing_jamon', qty: 0.12 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_jamon_morron',
        name: 'Pizza Jamón y Morrón',
        category: 'Pizzas',
        price: 10800,
        recipe: [
          { ingId: 'ing_masa', qty: 1 },
          { ingId: 'ing_muzza', qty: 0.30 },
          { ingId: 'ing_jamon', qty: 0.12 },
          { ingId: 'ing_morron', qty: 0.08 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_napo_jamon',
        name: 'Pizza Napo con Jamón',
        category: 'Pizzas',
        price: 10900,
        recipe: [
          { ingId: 'ing_masa', qty: 1 },
          { ingId: 'ing_muzza', qty: 0.30 },
          { ingId: 'ing_jamon', qty: 0.12 },
          { ingId: 'ing_tomate', qty: 0.25 },
          { ingId: 'ing_caja', qty: 1 }
        ]
      },
      {
        id: 'prod_empanada',
        name: 'Empanada Frita',
        category: 'Minutas',
        price: 1200,
        recipe: [
          { ingId: 'ing_empanada_u', qty: 1 },
          { ingId: 'ing_aceite', qty: 0.03 }
        ]
      },
      {
        id: 'prod_hamburguesa',
        name: 'Hamburguesa Completa',
        category: 'Minutas',
        price: 6500,
        recipe: [
          { ingId: 'ing_pan', qty: 1 },
          { ingId: 'ing_medallon', qty: 1 },
          { ingId: 'ing_muzza', qty: 0.05 },
          { ingId: 'ing_jamon', qty: 0.04 },
          { ingId: 'ing_caja', qty: 0.5 }
        ]
      },
      {
        id: 'prod_papas',
        name: 'Porción Papas Fritas',
        category: 'Minutas',
        price: 4200,
        recipe: [
          { ingId: 'ing_papa', qty: 0.65 },
          { ingId: 'ing_aceite', qty: 0.12 },
          { ingId: 'ing_caja', qty: 0.5 }
        ]
      },
      {
        id: 'prod_mila',
        name: 'Sándwich de Milanesa',
        category: 'Minutas',
        price: 7800,
        recipe: [
          { ingId: 'ing_pan', qty: 1 },
          { ingId: 'ing_milanesa', qty: 1 },
          { ingId: 'ing_jamon', qty: 0.04 },
          { ingId: 'ing_muzza', qty: 0.05 },
          { ingId: 'ing_aceite', qty: 0.08 }
        ]
      },
      {
        id: 'prod_bondiola',
        name: 'Sándwich de Bondiola',
        category: 'Minutas',
        price: 8500,
        recipe: [
          { ingId: 'ing_pan', qty: 1 },
          { ingId: 'ing_bondiola', qty: 0.25 },
          { ingId: 'ing_muzza', qty: 0.05 },
          { ingId: 'ing_caja', qty: 0.5 }
        ]
      },
      {
        id: 'prod_coca',
        name: 'Coca-Cola',
        category: 'Bebidas',
        price: 3200,
        recipe: [{ ingId: 'ing_coca', qty: 1 }]
      },
      {
        id: 'prod_sprite',
        name: 'Sprite',
        category: 'Bebidas',
        price: 3200,
        recipe: [{ ingId: 'ing_sprite', qty: 1 }]
      },
      {
        id: 'prod_manaos',
        name: 'Manaos',
        category: 'Bebidas',
        price: 2200,
        recipe: [{ ingId: 'ing_manaos', qty: 1 }]
      },
      {
        id: 'prod_placer',
        name: 'Agua Placer',
        category: 'Bebidas',
        price: 2000,
        recipe: [{ ingId: 'ing_placer', qty: 1 }]
      },
      {
        id: 'prod_agua',
        name: 'Agua Mineral',
        category: 'Bebidas',
        price: 1600,
        recipe: [{ ingId: 'ing_agua', qty: 1 }]
      }
    ],
    sales: [
      {
        id: 's_today_1',
        date: d0,
        time: '20:30',
        operator: 'Jonatan',
        note: 'Tanda 19:00 a 20:30',
        totalSale: 54700,
        totalCost: 19668,
        items: [
          { prodId: 'prod_muzza', name: 'Pizza Muzzarella', qty: 3, unitPrice: 8500, unitCost: 2644 },
          { prodId: 'prod_napo_jamon', name: 'Pizza Napo con Jamón', qty: 1, unitPrice: 10900, unitCost: 3926 },
          { prodId: 'prod_bondiola', name: 'Sándwich de Bondiola', qty: 1, unitPrice: 8500, unitCost: 2860 },
          { prodId: 'prod_coca', name: 'Coca-Cola', qty: 3, unitPrice: 3200, unitCost: 1650 }
        ]
      },
      {
        id: 's_today_2',
        date: d0,
        time: '22:45',
        operator: 'Benja',
        note: 'Tanda 20:30 a 22:45',
        totalSale: 51800,
        totalCost: 18790,
        items: [
          { prodId: 'prod_doble_muzza', name: 'Pizza Doble Muzza', qty: 2, unitPrice: 10800, unitCost: 3610 },
          { prodId: 'prod_mila', name: 'Sándwich de Milanesa', qty: 2, unitPrice: 7800, unitCost: 3524 },
          { prodId: 'prod_empanada', name: 'Empanada Frita', qty: 8, unitPrice: 1200, unitCost: 492 },
          { prodId: 'prod_manaos', name: 'Manaos', qty: 2, unitPrice: 2500, unitCost: 1293 }
        ]
      },
      {
        id: 's_d1',
        date: d1,
        time: '23:10',
        operator: 'Jonatan',
        note: 'Cierre jornada',
        totalSale: 94200,
        totalCost: 36400,
        items: [{ prodId: 'prod_muzza', name: 'Pizzas y minutas varias', qty: 10, unitPrice: 9420, unitCost: 3640 }]
      },
      {
        id: 's_d2',
        date: d2,
        time: '23:00',
        operator: 'Benja',
        note: 'Cierre jornada',
        totalSale: 112500,
        totalCost: 42900,
        items: [{ prodId: 'prod_muzza', name: 'Pizzas y sánguches', qty: 12, unitPrice: 9375, unitCost: 3575 }]
      },
      {
        id: 's_d3',
        date: d3,
        time: '22:50',
        operator: 'Jonatan',
        note: 'Cierre jornada',
        totalSale: 81400,
        totalCost: 31200,
        items: [{ prodId: 'prod_muzza', name: 'Ventas turno noche', qty: 9, unitPrice: 9044, unitCost: 3466 }]
      },
      {
        id: 's_d4',
        date: d4,
        time: '23:15',
        operator: 'Jonatan',
        note: 'Cierre jornada',
        totalSale: 104000,
        totalCost: 39800,
        items: [{ prodId: 'prod_muzza', name: 'Ventas turno noche', qty: 11, unitPrice: 9454, unitCost: 3618 }]
      },
      {
        id: 's_d5',
        date: d5,
        time: '22:40',
        operator: 'Benja',
        note: 'Cierre jornada',
        totalSale: 73500,
        totalCost: 28100,
        items: [{ prodId: 'prod_muzza', name: 'Ventas turno noche', qty: 8, unitPrice: 9187, unitCost: 3512 }]
      },
      {
        id: 's_d6',
        date: d6,
        time: '23:20',
        operator: 'Jonatan',
        note: 'Cierre jornada',
        totalSale: 68000,
        totalCost: 25900,
        items: [{ prodId: 'prod_muzza', name: 'Ventas inicio de semana', qty: 8, unitPrice: 8500, unitCost: 3237 }]
      }
    ],
    expenses: [
      {
        id: 'e_today_1',
        date: d0,
        time: '19:15',
        operator: 'Benja',
        category: 'Garrafa / Gas',
        description: 'Recarga garrafa de 10kg',
        amount: 12500
      },
      {
        id: 'e_today_2',
        date: d0,
        time: '21:10',
        operator: 'Jonatan',
        category: 'Casa y Familia (Papá)',
        description: 'Farmacia y compras para casa (papá)',
        amount: 15000
      },
      {
        id: 'e_d1_1',
        date: d1,
        time: '23:30',
        operator: 'Jonatan',
        category: 'Pago a Sever',
        description: 'Turno Sever (4 hs a $4.000/h)',
        amount: 16000
      },
      {
        id: 'e_d2_1',
        date: d2,
        time: '18:00',
        operator: 'Jonatan',
        category: 'Ofrenda Iglesia (Luz/Alquiler)',
        description: 'Ofrenda semanal iglesia (aporte luz)',
        amount: 40000
      },
      {
        id: 'e_d3_1',
        date: d3,
        time: '12:30',
        operator: 'Jonatan',
        category: 'Alquiler',
        description: 'Primer aporte mensual de alquiler',
        amount: 120000
      },
      {
        id: 'e_d4_1',
        date: d4,
        time: '23:30',
        operator: 'Benja',
        category: 'Pago a Sever',
        description: 'Turno Sever (4 hs a $4.500/h)',
        amount: 18000
      },
      {
        id: 'e_d5_1',
        date: d5,
        time: '11:20',
        operator: 'Jonatan',
        category: 'Luz',
        description: 'Aporte directo boleta de luz',
        amount: 60000
      }
    ],
    buyList: [
      { id: 'buy_1', text: '2 hormas de muzzarella', done: false, operator: 'Jonatan' },
      { id: 'buy_2', text: 'Pack de Coca-Cola y Manaos', done: false, operator: 'Benja' }
    ],
    todoList: [
      { id: 'todo_1', text: 'Amasar 25 bollos de pizza para el turno noche', done: false, operator: 'Jonatan' },
      { id: 'todo_2', text: 'Cortar 6kg de papas y dejar listas para freír', done: false, operator: 'Benja' }
    ]
  };
}

let state = loadState();
let currentOperator = 'Jonatan';
let currentPeriod = 'today';
let activeDate = getOffsetDateISO(0);
let activeCatFilter = 'Comida';
let draftCart = {};
let severHours = 4;
let severSelectedRate = 4500;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialState();
    const parsed = JSON.parse(raw);
    return { ...getInitialState(), ...parsed };
  } catch (e) {
    return getInitialState();
  }
}

function saveState(pushCloud = true) {
  state.meta.lastUpdated = Date.now();
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
    month: `Mes en curso (${activeDate.slice(0, 7)})`
  };

  document.getElementById('ledgerPeriodLabel').textContent = periodNames[currentPeriod];

  // Lead Finding under H1 (answers the screen's one question immediately)
  const goalDiff = todayM.grossSales - state.meta.dailySalesGoal;
  const goalPhrase =
    goalDiff >= 0
      ? `superaste la meta diaria de $100.000 por ${formatSignedARS(goalDiff)}`
      : `faltan ${formatARS(Math.abs(goalDiff))} para alcanzar la meta diaria de $100.000`;

  document.getElementById('screenFinding').textContent =
    `En la fecha ${activeDate} llevás ${formatARS(todayM.grossSales)} vendidos en ${todayM.tandasCount} tanda${
      todayM.tandasCount === 1 ? '' : 's'
    } (${goalPhrase}), con ${formatARS(todayM.netFreeProfit)} de ganancia libre tras separar reposición, gastos y casa.`;

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
      ? state.meta.dailySalesGoal * 6
      : state.meta.dailySalesGoal * 24;
  const vsTarget = m.grossSales - targetForPeriod;
  document.getElementById('kpiGrossDelta').innerHTML =
    `<span class="${vsTarget >= 0 ? 'up' : ''}">${formatSignedARS(vsTarget)}</span> frente a referencia de ${formatARS(targetForPeriod)}`;

  document.getElementById('kpiReplenishment').textContent = formatARS(m.cogsSold);
  document.getElementById('kpiReplenishmentDelta').textContent =
    `Costo de mercadería de las ${m.tandasCount} tandas vendidas`;

  document.getElementById('kpiOperatingExp').textContent = formatARS(m.operatingExpenses);
  document.getElementById('kpiOperatingDelta').textContent =
    m.familySupport > 0
      ? `Incluye ${formatARS(m.familySupport)} para Casa y Familia (Papá)`
      : `Garrafa, turnos de Sever, luz y alquiler`;

  // Render Bolsillos & Church Tree in left column
  const monthM = getMetricsForPeriod('month', activeDate);
  const rentPaidMonth = monthM.expensesInPeriod
    .filter(e => e.category === 'Alquiler')
    .reduce((s, e) => s + Math.round(Number(e.amount) || 0), 0);
  const lightOfferingsMonth = monthM.expensesInPeriod
    .filter(e => e.category === 'Luz' || e.category === 'Ofrenda Iglesia (Luz/Alquiler)')
    .reduce((s, e) => s + Math.round(Number(e.amount) || 0), 0);
  const severPaidMonth = monthM.expensesInPeriod
    .filter(e => e.category === 'Pago a Sever')
    .reduce((s, e) => s + Math.round(Number(e.amount) || 0), 0);
  const familyMonth = monthM.expensesInPeriod
    .filter(e => e.category === 'Casa y Familia (Papá)')
    .reduce((s, e) => s + Math.round(Number(e.amount) || 0), 0);

  const treeEl = document.getElementById('ledgerTreeContainer');
  treeEl.innerHTML = `
    <div class="ledger-group">
      <div class="ledger-group-head">
        <span>Cuentas del período</span>
        <span class="money-bold num">${formatARS(m.netFreeProfit)}</span>
      </div>
      <div class="ledger-leaf">
        <span>1. Caja bruta cobrada</span>
        <strong>${formatARS(m.grossSales)}</strong>
      </div>
      <div class="ledger-leaf">
        <span>2. Fondo reposición mercadería</span>
        <strong>\u2212${formatARS(m.cogsSold)}</strong>
      </div>
      <div class="ledger-leaf">
        <span>3. Gastos del local y Casa (Papá)</span>
        <strong>\u2212${formatARS(m.operatingExpenses)}</strong>
      </div>
    </div>

    <div class="ledger-group">
      <div class="ledger-group-head">
        <span>Acumulado del mes (Casa, Iglesia y Sever)</span>
        <span class="num">${formatARS(rentPaidMonth + lightOfferingsMonth + severPaidMonth + familyMonth)}</span>
      </div>
      <div class="ledger-leaf">
        <span>Casa y Familia (Papá) en el mes</span>
        <strong>${formatARS(familyMonth)}</strong>
      </div>
      <div class="ledger-leaf">
        <span>Alquiler aportado (meta ${formatARS(state.meta.rentMyGoal)})</span>
        <strong>${formatARS(rentPaidMonth)}</strong>
      </div>
      <div class="ledger-leaf">
        <span>Luz y ofrendas (meta ${formatARS(state.meta.lightMyGoal)})</span>
        <strong>${formatARS(lightOfferingsMonth)}</strong>
      </div>
      <div class="ledger-leaf">
        <span>Turnos pagados a Sever en el mes</span>
        <strong>${formatARS(severPaidMonth)}</strong>
      </div>
    </div>
  `;

  // Render Sever Shift Calculator
  const dateObj = new Date(activeDate + 'T12:00:00');
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayIdx = dateObj.getDay();
  const isSeverDay = [0, 2, 5, 6].includes(dayIdx);

  const pillEl = document.getElementById('severDayStatusPill');
  pillEl.textContent = isSeverDay ? `${dayNames[dayIdx]} · Turno activo` : `${dayNames[dayIdx]} · Opcional`;
  pillEl.className = `pill ${isSeverDay ? 'pos' : ''}`;

  let recRate = 3000;
  let recText = '';
  if (todayM.grossSales >= 100000) {
    recRate = 4500;
    recText = `Venta de hoy: ${formatARS(todayM.grossSales)} (superó los $100.000). Sugerido: $4.500/h.`;
  } else if (todayM.grossSales >= 85000) {
    recRate = 4000;
    recText = `Venta de hoy: ${formatARS(todayM.grossSales)} (buen movimiento). Sugerido: $4.000/h.`;
  } else if (todayM.grossSales >= 65000) {
    recRate = 3500;
    recText = `Venta de hoy: ${formatARS(todayM.grossSales)} (turno intermedio). Sugerido: $3.500/h.`;
  } else {
    recRate = 3000;
    recText = `Venta de hoy: ${formatARS(todayM.grossSales)} (día tranquilo). Sugerido: $3.000/h.`;
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
    if (activeCatFilter === 'Comida') return p.category === 'Pizzas' || p.category === 'Minutas' || p.id === 'prod_coca';
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

  const labels = [];
  const valuesInThousands = [];
  let sumWeek = 0;
  let daysOverGoal = 0;

  for (let i = 6; i >= 0; i--) {
    const iso = getOffsetDateISO(i);
    const daySales = state.sales
      .filter(s => s.date === iso)
      .reduce((sum, s) => sum + (Number(s.totalSale) || 0), 0);
    sumWeek += daySales;
    if (daySales >= state.meta.dailySalesGoal) daysOverGoal += 1;
    const shortDate = iso.slice(8, 10) + '/' + iso.slice(5, 7);
    labels.push(shortDate);
    valuesInThousands.push(Math.round(daySales / 1000));
  }

  const avgEl = document.getElementById('weeklyAvgFooter');
  if (avgEl) avgEl.textContent = formatARS(Math.round(sumWeek / 7));
  const sumEl = document.getElementById('weeklySumFooter');
  if (sumEl) sumEl.textContent = formatARS(sumWeek);
  const goalDaysEl = document.getElementById('weeklyGoalDaysFooter');
  if (goalDaysEl) goalDaysEl.textContent = `${daysOverGoal} de 7 días`;

  Charts.bars(chartEl, {
    labels,
    values: valuesInThousands,
    highlight: 6,
    height: 310,
    reference: { value: 100, label: 'Meta $100k' },
    format: v => `$${v}k`,
    tickFormat: v => `$${v}k`
  });
}

function renderTodayMovementsTable() {
  const tbody = document.getElementById('todayMovementsTableBody');
  tbody.innerHTML = '';

  const salesToday = state.sales
    .filter(s => s.date === activeDate)
    .map(s => ({ ...s, _kind: 'sale' }));
  const expToday = state.expenses
    .filter(e => e.date === activeDate)
    .map(e => ({ ...e, _kind: 'expense' }));

  const combined = [...salesToday, ...expToday].sort((a, b) =>
    (b.time || '').localeCompare(a.time || '')
  );

  const countEl = document.getElementById('todayMovementsCount');
  if (countEl) {
    countEl.textContent = `${combined.length} registro${combined.length === 1 ? '' : 's'}`;
  }

  if (combined.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; color:var(--muted); padding:20px;">
          Sin movimientos cargados en la fecha ${activeDate}. Usá el panel superior para guardar una tanda.
        </td>
      </tr>
    `;
    return;
  }

  combined.forEach(row => {
    const tr = document.createElement('tr');
    if (row._kind === 'sale') {
      const itemsText = (row.items || []).map(i => `${i.qty}x ${i.name}`).join(', ');
      tr.innerHTML = `
        <td class="num">
          ${row.time}
          <span class="sub">${row.operator}</span>
        </td>
        <td>
          <span class="pill pos">Tanda venta</span>
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
          ${row.time}
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
      <td class="n money-bold num">${formatARS(prod.price)}</td>
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
  const weekM = getMetricsForPeriod('week', activeDate);
  const ranked = [...state.products].sort(
    (a, b) => getProductMarginPercent(b) - getProductMarginPercent(a)
  );
  const best = ranked[0];
  const lowest = ranked[ranked.length - 1];

  const rowsEl = document.getElementById('autoInsightsRows');
  rowsEl.innerHTML = `
    <div class="row">
      <div>
        <div style="font-weight:500;">Disponible neto de los últimos 7 días</div>
        <div class="meta">Descontando ${formatARS(weekM.cogsSold)} de reposición y ${formatARS(weekM.operatingExpenses)} de gastos</div>
      </div>
      <div class="money-bold num">${formatARS(weekM.netFreeProfit)}</div>
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
  const weekM = getMetricsForPeriod('week', activeDate);
  const estimatedMonthlyNet = Math.max(weekM.netFreeProfit * 4, 850000);
  const safeThreshold = Math.round(estimatedMonthlyNet * 0.25);

  const box = document.getElementById('simVerdictBox');
  if (quota <= safeThreshold) {
    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <strong>Cuota saludable</strong>
        <span class="pill pos num">Hasta ${formatARS(safeThreshold)}/mes seguro</span>
      </div>
      <p class="meta">
        La cuota de ${formatARS(quota)} consume menos del 25% de tu ganancia libre mensual proyectada (~${formatARS(
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
        Una cuota de ${formatARS(quota)} exige más del 25% de tu ganancia libre mensual proyectada (~${formatARS(
      estimatedMonthlyNet
    )}). Solo se recomienda si el equipamiento reduce costos de insumos o aumenta las tandas por noche.
      </p>
    `;
  }
}

async function askAdvisor(question) {
  const log = document.getElementById('advisorChatLog');

  const uDiv = document.createElement('div');
  uDiv.className = 'chat-entry user';
  uDiv.textContent = question;
  log.appendChild(uDiv);

  const aDiv = document.createElement('div');
  aDiv.className = 'chat-entry assistant';
  aDiv.textContent = 'Calculando sobre tus registros...';
  log.appendChild(aDiv);
  log.scrollTop = log.scrollHeight;

  const todayM = getMetricsForPeriod('today', activeDate);
  const weekM = getMetricsForPeriod('week', activeDate);
  const monthM = getMetricsForPeriod('month', activeDate);

  if (state.meta.geminiApiKey) {
    try {
      const payload = {
        hoy: todayM,
        semana: weekM,
        mes: monthM,
        productos: state.products.map(p => ({
          nombre: p.name,
          venta: p.price,
          costo: calculateProductCost(p),
          margen: getProductMarginPercent(p)
        }))
      };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
          state.meta.geminiApiKey
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Sos el consultor financiero de un local gastronómico familiar de pizzas, sánguches, empanadas y bebidas. Respondé conciso y con números exactos usando este contexto: ${JSON.stringify(
                      payload
                    )}. Pregunta: ${question}`
                  }
                ]
              }
            ]
          })
        }
      );
      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) {
        aDiv.innerHTML = reply.replace(/\n/g, '<br>');
        log.scrollTop = log.scrollHeight;
        return;
      }
    } catch (e) {
      // Fallback to local engine
    }
  }

  const q = question.toLowerCase();
  if (q.includes('rentable') || q.includes('ganancia') || q.includes('producto')) {
    const byUnitProfit = [...state.products]
      .map(p => ({
        name: p.name,
        profit: p.price - calculateProductCost(p),
        pct: getProductMarginPercent(p)
      }))
      .sort((a, b) => b.profit - a.profit);

    const top = byUnitProfit
      .slice(0, 3)
      .map(x => `• <strong>${x.name}</strong>: +${formatARS(x.profit)} limpios por unidad (${x.pct}%)`)
      .join('<br>');
    aDiv.innerHTML = `<strong>Productos que más dinero limpio dejan por unidad:</strong><br>${top}`;
  } else if (q.includes('muzzarella') || q.includes('15%')) {
    const muzza = getIngredientById('ing_muzza');
    const currentPrice = muzza ? muzza.price : 4200;
    const nextPrice = Math.round(currentPrice * 1.15);
    const diffPerPizza = Math.round((nextPrice - currentPrice) * 0.32);
    aDiv.innerHTML = `Si la muzzarella sube 15% (de ${formatARS(currentPrice)} a ${formatARS(
      nextPrice
    )}/kg), el costo de cada Pizza Muzzarella sube <strong>+${formatARS(
      diffPerPizza
    )}</strong>. Para sostener tu margen del 68%, deberías ajustar el precio de venta unos <strong>+${formatARS(
      Math.ceil((diffPerPizza * 2.5) / 100) * 100
    )}</strong>.`;
  } else if (q.includes('iglesia') || q.includes('alquiler') || q.includes('luz') || q.includes('sever')) {
    const rent = monthM.expensesInPeriod
      .filter(e => e.category === 'Alquiler')
      .reduce((s, e) => s + Number(e.amount), 0);
    const light = monthM.expensesInPeriod
      .filter(e => e.category === 'Luz' || e.category === 'Ofrenda Iglesia (Luz/Alquiler)')
      .reduce((s, e) => s + Number(e.amount), 0);
    const sever = monthM.expensesInPeriod
      .filter(e => e.category === 'Pago a Sever')
      .reduce((s, e) => s + Number(e.amount), 0);
    aDiv.innerHTML = `<strong>Acumulado del mes actual:</strong><br>• Alquiler aportado: <strong>${formatARS(
      rent
    )}</strong> (Meta habitual: ${formatARS(state.meta.rentMyGoal)})<br>• Luz directa + Ofrendas: <strong>${formatARS(
      light
    )}</strong> (Meta habitual: ${formatARS(state.meta.lightMyGoal)})<br>• Turnos pagados a Sever: <strong>${formatARS(
      sever
    )}</strong>`;
  } else {
    aDiv.innerHTML = `Hoy llevás <strong>${formatARS(
      todayM.grossSales
    )}</strong> vendidos. Separando <strong>${formatARS(
      todayM.cogsSold
    )}</strong> para reponer la mercadería que salió y descontando <strong>${formatARS(
      todayM.operatingExpenses
    )}</strong> de gastos del día, podés disponer de <strong>${formatARS(
      todayM.netFreeProfit
    )} limpios</strong>. En los últimos 7 días tu saldo libre acumulado es de <strong>${formatARS(
      weekM.netFreeProfit
    )}</strong>.`;
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

  // Sever controls
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
      category: 'Pago a Sever',
      description: `Turno Sever (${severHours} hs a ${formatARS(severSelectedRate)}/h)`,
      amount
    });
    saveState();
    renderAll();
    showToast(`Pago a Sever registrado: ${formatARS(amount)}`);
  });

  // Copy WhatsApp summary
  document.getElementById('btnCopyWhatsapp').addEventListener('click', () => {
    const m = getMetricsForPeriod('today', activeDate);
    const msg =
      `CIERRE DEL DIA (${activeDate})\n` +
      `- Vendido bruto: ${formatARS(m.grossSales)} (${m.tandasCount} tandas)\n` +
      `- Fondo reposicion mercaderia: ${formatARS(m.cogsSold)}\n` +
      `- Gastos del local y casa hoy: ${formatARS(m.operatingExpenses)}${
        m.familySupport > 0 ? ` (Casa/Papa: ${formatARS(m.familySupport)})` : ''
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

  // Product & Recipe modal
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
    }
    saveState();
    closeProductModal();
    renderAll();
    showToast('Receta actualizada');
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
    const k = prompt('Pegá tu API Key de Google Gemini (o dejá vacío para usar el motor local):', state.meta.geminiApiKey || '');
    if (k !== null) {
      state.meta.geminiApiKey = k.trim();
      saveState();
      showToast(state.meta.geminiApiKey ? 'API Key guardada' : 'Motor local activo');
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
