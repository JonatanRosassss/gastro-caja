# Caja & Cocina — Libro Mayor Gastronómico (Documentación Maestra para Agentes y Desarrolladores)

> **IMPORTANTE PARA CUALQUIER AGENTE DE IA / NUEVO CHAT EN ANTIGRAVITY:**
> Este documento contiene el contexto real del negocio, la arquitectura funcional, el modelo contable, los datos reales de Octubre 2026, el flujo de usuario (UX) y las reglas estrictas del sistema de diseño (`achromatic-ledger` / `taste-skill` / `impeccable`). **Leé este archivo completo antes de modificar cualquier línea de código.**

---

## 1. Contexto Real del Negocio y Usuarios

- **Rubro:** Local gastronómico familiar de comidas rápidas y minutas nocturnas/mediodía (Pizzas, Promos 3x$27.000, Empanadas fritas y al horno, Sánguches de Bondiola, Sánguches de Milanesa, Hamburguesas, Porciones de Papas Fritas y Bebidas).
- **Operadores principales (Socios/Hermanos):**
  1. **Jonatan** (`jona` en WhatsApp) — Administrador principal, cocina, compras y cierres de caja.
  2. **Benja** (`Benjunin El` en WhatsApp) — Hermano y socio operativo en cocina, compras y despacho.
- **Empleado por turno:**
  - **Heber** *(Nota: en audios viejos fue transcripto por error como "Sever", pero su nombre real es **Heber**)*.
  - Trabaja principalmente los **martes, viernes, sábados y domingos** (aprox. 4 horas por jornada).
  - Su pago por hora es flexible según cuánto se haya vendido en la noche (`$3.000/h`, `$3.500/h`, `$3.750/h` o `$4.500/h` si la venta superó los `$100.000`). En la práctica cobra entre **`$12.000` y `$15.000` por turno** (o `$28.000` por sábado + domingo juntos).
- **Situación de Alquiler, Luz e Iglesia:**
  - El local está pegado a la **Iglesia**, de la cual se encargan los papás de Jonatan y Benja.
  - El alquiler total ronda los `$800.000` y la luz unos `$270.000`, pero el negocio aporta lo que puede según el movimiento del mes, muchas veces de forma indirecta bajo el concepto de **Ofrenda Iglesia** (ej. `$100.000` de ofrenda).
- **Situación Familiar (Casa / Mami / Papá):**
  - El papá de Jonatan y Benja fue operado recientemente, por lo que no hay un ingreso fijo externo en la casa familiar.
  - El negocio realiza aportes frecuentes para sostener el hogar (**Categoría: `Casa y Familia (Papá)`**), anotados en WhatsApp como `"60 a mami"` (`$60.000`), `"cosas de casa 12.000"`, `"jabón y cloro para mami 7.000"`, `"pepsi para casa"`, `"galletitas para mami"`.

---

## 2. Arquitectura y Despliegue

- **Directorio del proyecto:** `C:\Users\Chouni\.gemini\antigravity\scratch\gastro-caja`
- **Repositorio GitHub:** `https://github.com/JonatanRosassss/gastro-caja` (rama `main`)
- **URL en producción (GitHub Pages):** `https://jonatanrosassss.github.io/gastro-caja/`
- **Stack técnico:** HTML5 + CSS3 Vanilla (`styles.css`) + JavaScript Vanilla (`app.js`, `charts.js`) + Service Worker Offline-First (`sw.js`) + Web App Manifest (`manifest.json`). Sin dependencias pesadas ni frameworks que requieran build step.
- **Requisito Offline-First obligatorio:** En el local gastronómico **no tienen Wi-Fi fijo**. La aplicación debe funcionar 100% offline desde el celular guardando en `localStorage` (`STORAGE_KEY = 'gastro_caja_octubre_real_v1'`), con respaldo opcional a Firebase Realtime Database y exportación/importación `.json`.

---

## 3. Modelo Contable Invariante: "Los 3 Bolsillos"

El objetivo central de Jonatan es saber **cuánta plata limpia le queda realmente para gastar o invertir sin comerse la plata que necesita para reponer la mercadería**.

En `getMetricsForPeriod(period, refDateStr)` dentro de `app.js`, la contabilidad se divide en **3 bolsillos estrictos**:

1. **Caja Bruta Vendida (`grossSales`):**
   Suma total de todas las tandas/cierres de venta del período.
2. **Fondo de Reposición de Mercadería (`cogsSold` vs `stockPurchases`):**
   - `cogsSold`: Costo teórico de receta de cada producto vendido (lo que hay que separar sí o sí para volver a comprar la muzzarella, carne, pan y bebida que salieron).
   - `stockPurchases`: Compras reales de insumos (`Mercadería / Insumos`) y descartables (`Descartables / Cajas`) pagadas en el período.
3. **Salidas Operativas, Casa y Retiros (`operatingExpenses`):**
   Todos los egresos que **no** son mercadería ni descartables:
   - `Garrafa / Gas` (`$26.000` cada garrafa de 10kg)
   - `Pago a Heber` (turnos pagados al empleado)
   - `Casa y Familia (Papá)` (aportes a mami/papá y gastos de la casa)
   - `Ofrenda Iglesia (Luz/Alquiler)`, `Alquiler`, `Luz`
   - `Equipamiento y Local` (freidora, arreglo heladera, pintura, trapos)
   - `Retiro Personal` (retiros personales de Benja y Jonatan)
   - `Consumo / Merma` (pizzas o empanadas consumidas en el local o perdidas)

> **Fórmula maestra inquebrantable (`netFreeProfit`):**
> $$\text{Saldo Libre en Caja} = \text{Caja Bruta Vendida} - \text{Costo de Reposición (Receta)} - \text{Salidas Operativas, Casa y Retiros}$$

---

## 4. Trazo del Usuario (UX) y Clasificador Inteligente de WhatsApp

Jonatan y Benja están acostumbrados a anotar todo rápido en un grupo de WhatsApp desde el celular mientras cocinan o al cerrar la noche.

### Funcionalidades clave que NUNCA se deben eliminar ni degradar:
1. **Clasificador Inteligente en 1 línea (`classifyExpenseText` en `app.js`):**
   - Ubicado tanto en la pantalla principal (`#formQuickSmartExpense`) como en la pestaña de Gastos (`#formAddExpense`).
   - **Soporte de pegado multilínea desde WhatsApp:** Si el usuario copia 10 líneas juntas desde WhatsApp y las pega en la barra rápida, el evento `paste` las separa por salto de línea y registra todos los egresos automáticamente.
   - **Limpieza automática de formato WhatsApp:** Ignora prefijos `[10/27, 10:13 PM] jona:` o `[10/18, 12:07 AM] Benjunin El:`.
   - **Corrección de typos móviles:** Convierte errores de tipeo reales como `7.0p0` $\rightarrow$ `7000`.
   - **Comprensión de números abreviados en miles:** Si el texto no tiene puntos de mil y dice `"60 a mami"`, `"25 heber"`, `"benja 80"`, `"30 heber"`, multiplica automáticamente $\times 1.000$ (`$60.000`, `$25.000`, `$80.000`).
   - **Cálculo automático de costo unitario por insumo:** Si escribe `"10kl de muzza 80.000"` o `"1kg y 1/2 de bondiola 11.000"` o `"2kl de picada 20.000"`, detecta la cantidad (`10`, `1.5`, `2`), divide el monto total por los kilos y actualiza automáticamente el precio por kilo del insumo en la base de recetas.
2. **Anotador de Tandas de Venta (`#productCounterGrid`):**
   - El filtro por defecto DEBE ser **`Toda la carta` (`data-cat="all"`)** para que cualquier bebida o producto nuevo que agregue Jonatan se vea siempre en la pantalla principal.
   - Al crear un producto nuevo desde el modal, `activeCatFilter` vuelve a `'all'` automáticamente.
3. **Edición rápida de precios de venta e insumos (`#screen-costs`):**
   - En la pestaña **Insumos y recetas**, tanto los costos de insumos (`data-ing-input`) como los **precios de venta de cada producto** (`data-prod-price-input`) tienen `<input type="number">` editables en línea (sin tener que abrir el modal uno por uno).
4. **Consultor Financiero con Gemini IA (`#screen-advisor`):**
   - Guarda la API Key en `localStorage.getItem('gastro_gemini_key')` y el modelo preferido en `localStorage.getItem('gastro_gemini_model')` para que **nunca se pierdan** aunque cambie `STORAGE_KEY`.
   - Usa autodetección de modelos modernos habilitados en la cuenta (`discoverAvailableGeminiModels` vía `GET /v1beta/models`), priorizando siempre modelos **`Flash`** rápidos (`3.8`, `3.7`, `3.5`, `3.1`, `3.0`, `2.5 Flash`) con `fetchWithTimeout` para que jamás se cuelgue en modelos lentos de razonamiento (`Pro` / `Thinking`).
   - Filtra partes internas `part.thought === true` de los modelos Gemini 2.5/3.x y muestra una pastilla verde `Gemini IA (modelo)` en cada respuesta.

---

## 5. Base de Datos Real de Octubre 2026 (Precios, Recetas y Métricas)

### 5.1 Costos Reales de Insumos (`state.ingredients`)
| ID | Insumo | Unidad | Costo Real (Octubre) | Origen en WhatsApp |
| :--- | :--- | :--- | ---: | :--- |
| `ing_muzza` | Muzzarella | `kg` | **`$8.000`** | Horma 10kg `$80.000` / 5kg `$40.000` |
| `ing_carne_picada` | Carne picada (Empanadas) | `kg` | **`$10.000`** | 2kg `$20.000` |
| `ing_nalga` | Milanesa de nalga (armada) | `unid` | **`$2.400`** | Compras de nalga `$12.000` a `$18.000` |
| `ing_bondiola` | Bondiola desmenuzada | `kg` | **`$7.333`** | 1,5kg `$11.000` |
| `ing_medallon` | Medallón Hamburguesa | `unid` | **`$1.083`** | 12 paquetes `$26.000` |
| `ing_tapa_emp` | Tapa de empanada | `unid` | **`$110`** | Fardo disco emp `$7.800–$7.900` |
| `ing_papa_bolsa` | Papas fritas (bolsa ~2.5kg) | `bolsa` | **`$4.430`** | 7 bolsas `$31.000` |
| `ing_harina` | Bollo de masa + salsa base | `unid` | **`$950`** | Harina `$20.000`, Levadura `$4.500`, Salsa `$11.300` |
| `ing_jamon` | Jamón cocido | `kg` | **`$9.000`** | Compras de `$1.800` a `$4.500` |
| `ing_pan` | Pan (Sánguche / Hamb) | `unid` | **`$650`** | Pan `$3.000` a `$7.000` |
| `ing_verdura` | Tomate, lechuga, morrón, cebolla | `porc` | **`$400`** | Verdulería diaria |
| `ing_caja` | Caja de pizza / Bandeja / Papel | `unid` | **`$390`** | Cajas `$12.000–$13.700`, bandejas `$8.500` |
| `ing_coca_175` | Coca-Cola 1.75L (Costo) | `unid` | **`$3.375`** | Pack `$27.000` |
| `ing_coca_600` | Gaseosa 500/600ml (Costo) | `unid` | **`$1.500`** | Pack `$9.000` |
| `ing_placer_15` | Agua Placer 1.5L (Costo) | `unid` | **`$1.400`** | Packs `$16.800` / `$5.600` |
| `ing_placer_500` | Agua Placer 500ml (Costo) | `unid` | **`$933`** | Pack `$5.600` |
| `ing_brahma` | Cerveza Brahma lata (Costo) | `unid` | **`$1.833`** | Pack `$11.000` |

### 5.2 Carta Real de Productos (`state.products`)
- **Pizzas y Promos:** `Pizza Muzzarella` (`$10.000`), `Promo 3 Muzzas (3x$27.000)` (`$27.000`), `Pizza Especial Jamón` (`$13.000`), `Pizza Napolitana` (`$13.000`), `Pizza Napo con Jamón` (`$15.000`), `Pizza Jamón y Morrón (JyM)` (`$16.000`), `Promo Muzza + Especial` (`$23.000`).
- **Empanadas y Minutas:** `Docena Empanadas Fritas` (`$14.000`), `Docena Emp. Horno Grande` (`$16.000`), `Media Docena Empanadas` (`$7.000`), `4 Empanadas Fritas` (`$4.800`), `Empanada Frita (Unidad)` (`$1.500`), `Sánguche de Bondiola` (`$7.000`), `Bondiola + Guarnición Papas` (`$9.500`), `Sánguche de Mila Grande` (`$14.000`), `Sánguche Mila Individual` (`$6.000`), `Hamburguesa` (`$6.000`), `Hamburguesa Doble + Papas` (`$10.000`), `Porción Grande de Papas` (`$8.000`), `Porción de Papas Fritas` (`$5.000`), `Papas Noisette / Bolitas` (`$4.500`), `Cono de Papas` (`$3.000`).
- **Bebidas:** `Coca-Cola 1.75L` (`$5.500`), `Coca-Cola 500ml / 600ml` (`$3.000`), `Sprite` (`$3.000`), `Manaos` (`$3.000`), `Agua Placer Grande 1.5L` (`$3.000`), `Agua Placer 500ml` (`$2.000`), `Cerveza Brahma` (`$3.500`).

### 5.3 Resumen Real de Octubre (`1/10` al `28/10`)
- **Ventas brutas registradas (24 cierres):** `$2.222.700`
- **Costo de reposición estimado por receta:** `$893.080` (Compras reales de mercadería/descartables en el mes: `$716.500`)
- **Salidas operativas, Casa, Iglesia, Equipamiento y Retiros:** `$1.072.300`
  - `Equipamiento y Local`: `$271.000` (Freidora `$197k`, Pintura `$33k`, Elástico heladera `$23k`, Trapos `$18k`)
  - `Retiro Personal`: `$278.000` (Benja `$160k` + Jonatan `$118k`)
  - `Garrafa / Gas`: `$156.000` (6 garrafas a `$26.000` c/u)
  - `Pago a Heber`: `$137.000`
  - `Ofrenda Iglesia (Luz/Alquiler)`: `$100.000`
  - `Casa y Familia (Papá)`: `$92.300`
  - `Consumo / Merma`: `$38.000`
- **Saldo libre neto en caja de Octubre:** `$257.320`

---

## 6. Sistema de Diseño y Reglas Inquebrantables (`achromatic-ledger`)

La interfaz sigue la dirección artística **`achromatic-ledger`** de la skill `taste-skill` (inspirada en Linear / Stripe Dashboard / Mercury), auditada bajo las normas de `impeccable` y `ui-ux-pro-max`.

### 6.1 Paleta de Colores Exacta (`styles.css`)
**NO cambiar estos tokens ni agregar colores saturados fuera de las píldoras semánticas:**

```css
:root {
  /* Superficies cálidas acromáticas (Warm Paper & Ink) */
  --ground: #f4f3f1;         /* Fondo general de la aplicación */
  --surface: #ffffff;        /* Paneles y tarjetas */
  --surface-subtle: #faf9f7; /* Cabeceras de tabla y fondos secundarios */
  --surface-hover: #f0efec;  /* Hover sutil en filas y botones */
  --border: #e5e4e1;         /* Bordes hairline de 1px */
  --rule: #eeedea;           /* Divisor interno entre filas */
  --control: #d6d5d0;        /* Bordes de inputs y controles */

  /* Jerarquía de texto */
  --text: #141413;           /* Tinta principal (títulos, montos, cuerpo) */
  --muted: #65645f;          /* Etiquetas secundarias y metadatos */
  --faint: #9c9a94;          /* Placeholders y ayudas */

  /* Acento y semántica financiera */
  --accent: #141413;         /* Botones primarios en negro tinta cálido */
  --accent-fg: #ffffff;
  --positive: #156d3b;       /* Ganancia / Margen saludable */
  --positive-bg: #e6f4ec;
  --warning: #94580a;        /* Advertencia / Margen ajustado */
  --warning-bg: #fef3c7;
  --negative: #b92b27;       /* Egreso / Pérdida / Merma */
  --negative-bg: #fbeae9;
}
```

### 6.2 Tipografía y Números Tabulares
- **Fuente única:** `'Geist', -apple-system, BlinkMacSystemFont, sans-serif`.
- **Números tabulares obligatorios:** Todo precio, monto en pesos, porcentaje, hora, fecha y contador DEBE llevar `font-variant-numeric: tabular-nums` (clase `.num`, `.kpi-value`, `td.n`, `.ledger-leaf strong`) y `white-space: nowrap` en montos de listas para que el signo `-` nunca se separe del número en pantallas móviles de `390px`.

### 6.3 Prohibiciones Estrictas ("Cosas que NO se deben hacer")
1. **CERO Emojis en el código (`[no-emoji]`):** No usar jamás emojis (`🍕`, `💰`, `🔥`, `✅`, etc.) en `index.html`, `app.js` ni `styles.css`. Usar únicamente íconos SVG monocromáticos de `15px` con `stroke="currentColor"` o etiquetas tipográficas `.pill`.
2. **CERO Sombras en reposo (`[flat-Default]`):** Los paneles `.panel`, tarjetas `.kpi-cell` y botones `.btn` tienen `box-shadow: none` y se separan exclusivamente mediante bordes hairline de `1px solid var(--border)` sobre el fondo `--ground: #f4f3f1`. Solo los modales flotantes y toasts pueden tener sombra.
3. **CERO Gradientes, Glassmorphism o Bordes Redondeados Excesivos:** Mantener `--radius-card: 8px` y `--radius-control: 6px`. No usar `backdrop-filter: blur()` en paneles ni fondos degradados.
4. **CERO Espacios Vacíos en Paneles (`[panel-void]`):** Cuando una columna comparte fila con otra en `.grid.mid`, las listas largas (`#productCounterGrid`, `.table-wrap`) deben mantener su `max-height: 340px; overflow-y: auto` para que ninguna tarjeta se estire dejando más del 25% de espacio vacío en la columna vecina.
5. **Máximo 4 KPIs en la banda superior (`#kpiBand`):** La fila `.kpi-band` tiene 4 celdas:
   - Celda 1 (protagonista `32px`): `Saldo libre en caja`
   - Celdas 2, 3 y 4 (`24px`): `Caja bruta vendida`, `Fondo de reposición`, `Aporte a Casa / Papá y Gastos`

---

## 7. Protocolo de Verificación y Despliegue Antes de Cerrar Cualquier Tarea

Siempre que otro agente realice cambios en este proyecto, debe ejecutar los dos scripts de validación de `taste-skill` desde PowerShell y confirmar **`RESULT: 0 FAIL, 0 WARN`**:

```powershell
# 1. Linter estático de código (verifica cero emojis, sombras prohibidas o patrones slop)
node "C:\Users\Chouni\.gemini\config\skills\taste-skill\scripts\lint.mjs" --app index.html styles.css app.js

# 2. Inspector visual en navegador real (verifica renders en 1440px, 768px y 390px)
node "C:\Users\Chouni\.gemini\config\skills\taste-skill\scripts\inspect.mjs" --app index.html
```

Y luego de verificar:
1. Incrementar la versión de `CACHE_NAME` en `sw.js` (ej. `'gastro-caja-offline-v7'`) y el parámetro `?v=X` en `index.html` para que los celulares actualicen al instante.
2. Borrar la carpeta temporal `.taste-skill` y subir a GitHub Pages:
   ```powershell
   Remove-Item -Recurse -Force .taste-skill -ErrorAction SilentlyContinue
   git add .
   git commit -m "descripcion del cambio"
   git push origin main
   ```
