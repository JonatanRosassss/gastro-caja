// ============================================================================
// CAPA DE DATOS: Datos Semilla Reales de Octubre (Jonatan, Benja y Heber)
// Responsabilidad única: Proveer el estado inicial de insumos, recetas,
// cierres de venta, egresos y listas de Octubre 2026.
// ============================================================================

export function getInitialState() {
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
    expenses: [
      { id: 'oct_e_01', date: '2026-10-01', time: '01:29', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Aceite ($17.500), Harina ($20.000) y Levadura ($4.500)', amount: 42000 },
      { id: 'oct_e_02', date: '2026-10-01', time: '01:30', operator: 'Jonatan', category: 'Consumo / Merma', description: '4 empanadas (Jaki y Mati)', amount: 2000 },
      { id: 'oct_e_03', date: '2026-10-02', time: '02:29', operator: 'Jonatan', category: 'Consumo / Merma', description: 'Pizza para nosotros', amount: 4000 },
      { id: 'oct_e_04', date: '2026-10-02', time: '02:30', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Disquitos de empanada', amount: 1800 },
      { id: 'oct_e_05', date: '2026-10-05', time: '22:01', operator: 'Jonatan', category: 'Descartables / Cajas', description: 'Papel manteca ($5.700), papel envolver ($4.500) y bandejas ($8.500)', amount: 18700 },
      { id: 'oct_e_06', date: '2026-10-05', time: '22:02', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Nalga ($18.000) y Carne picada 2kg ($20.000)', amount: 38000 },
      { id: 'oct_e_07', date: '2026-10-07', time: '02:27', operator: 'Jonatan', category: 'Garrafa / Gas', description: 'Garrafa', amount: 26000 },
      { id: 'oct_e_08', date: '2026-10-07', time: '02:28', operator: 'Jonatan', category: 'Pago a Heber', description: 'Pago a Heber', amount: 30000 },
      { id: 'oct_e_09', date: '2026-10-07', time: '02:29', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Disco de emp ($7.800) y Ajo + lechuga + tomate ($4.200)', amount: 12000 },
      { id: 'oct_e_10', date: '2026-10-07', time: '23:24', operator: 'Jonatan', category: 'Descartables / Cajas', description: 'Cajas de pizza', amount: 12000 },
      { id: 'oct_e_11', date: '2026-10-07', time: '23:24', operator: 'Jonatan', category: 'Mercadería / Insumos', description: '7 bolsas de Papas fritas', amount: 31000 },
      { id: 'oct_e_12', date: '2026-10-07', time: '23:25', operator: 'Jonatan', category: 'Casa y Familia (Papá)', description: 'Galletitas para mami ($3.400) + rosquita/garrapiñadas ($3.400)', amount: 6800 },
      { id: 'oct_e_13', date: '2026-10-07', time: '23:26', operator: 'Jonatan', category: 'Consumo / Merma', description: '-2 pizzas', amount: 8000 },
      { id: 'oct_e_14', date: '2026-10-08', time: '17:49', operator: 'Jonatan', category: 'Equipamiento y Local', description: 'Elástico para la heladera', amount: 23000 },
      { id: 'oct_e_15', date: '2026-10-08', time: '17:50', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Muzzarella (horma 5kg)', amount: 40000 },
      { id: 'oct_e_16', date: '2026-10-09', time: '02:16', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Lata salsa ($11.300), Bondiola 1,5kg ($11.000), Jamón ($2k), Verdura ($1.2k)', amount: 25500 },
      { id: 'oct_e_17', date: '2026-10-09', time: '02:17', operator: 'Jonatan', category: 'Consumo / Merma', description: 'Se perdieron como 14 empanadas', amount: 7000 },
      { id: 'oct_e_18', date: '2026-10-10', time: '12:19', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Disco empanadas ($7.900) y Verdeo ($500)', amount: 8400 },
      { id: 'oct_e_19', date: '2026-10-10', time: '12:19', operator: 'Jonatan', category: 'Garrafa / Gas', description: 'Garrafa', amount: 26000 },
      { id: 'oct_e_20', date: '2026-10-10', time: '12:20', operator: 'Jonatan', category: 'Equipamiento y Local', description: 'Freidora nueva ($197.000) + 12 Trapos ($18.000)', amount: 215000 },
      { id: 'oct_e_21', date: '2026-10-10', time: '12:33', operator: 'Jonatan', category: 'Retiro Personal', description: 'Pizzas Jaqui ($30.000 aprox) + Cumple Santi ($3.000)', amount: 33000 },
      { id: 'oct_e_22', date: '2026-10-13', time: '00:49', operator: 'Jonatan', category: 'Casa y Familia (Papá)', description: '60 a mami (aporte casa)', amount: 60000 },
      { id: 'oct_e_23', date: '2026-10-13', time: '00:50', operator: 'Jonatan', category: 'Pago a Heber', description: '25 Heber', amount: 25000 },
      { id: 'oct_e_24', date: '2026-10-14', time: '01:48', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Grasa ($2.600) + Lechuga, tomate y morrón ($3.900)', amount: 6500 },
      { id: 'oct_e_25', date: '2026-10-14', time: '01:49', operator: 'Jonatan', category: 'Consumo / Merma', description: '-2 Muzzas', amount: 10000 },
      { id: 'oct_e_26', date: '2026-10-14', time: '13:30', operator: 'Jonatan', category: 'Retiro Personal', description: 'Gasto en Once (~$60.000)', amount: 60000 },
      { id: 'oct_e_27', date: '2026-10-15', time: '02:33', operator: 'Jonatan', category: 'Garrafa / Gas', description: 'Garrafa', amount: 26000 },
      { id: 'oct_e_28', date: '2026-10-15', time: '23:28', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Muzza 10kg ($80.000), Carne picada ($20.000), Jamón y Verdura ($5.400)', amount: 105400 },
      { id: 'oct_e_29', date: '2026-10-17', time: '23:55', operator: 'Jonatan', category: 'Pago a Heber', description: 'Heber turno viernes', amount: 12000 },
      { id: 'oct_e_30', date: '2026-10-17', time: '23:56', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Pan ($3.000), Jamón ($1.800), Cebolla/tomate/verdeo ($4.500), 2 emp ($2.000)', amount: 11300 },
      { id: 'oct_e_31', date: '2026-10-17', time: '23:57', operator: 'Jonatan', category: 'Descartables / Cajas', description: 'Detergente', amount: 2500 },
      { id: 'oct_e_32', date: '2026-10-18', time: '00:05', operator: 'Jonatan', category: 'Mercadería / Insumos', description: 'Carne picada ($20k), Nalga ($17k), Pan ($5.8k), Grasa ($2.5k), Verdura ($8.8k)', amount: 54100 },
      { id: 'oct_e_33', date: '2026-10-18', time: '00:06', operator: 'Jonatan', category: 'Garrafa / Gas', description: 'Garrafa', amount: 26000 },
      { id: 'oct_e_34', date: '2026-10-18', time: '00:07', operator: 'Jonatan', category: 'Casa y Familia (Papá)', description: 'Cosas de casa', amount: 12000 },
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
