# CONVENTIONS.md — Arquitectura en Capas, Convenciones de Código y Guía para Agentes IA

> **LECTURA OBLIGATORIA PARA AGENTES DE IA Y DESARROLLADORES:**
> Antes de modificar cualquier funcionalidad de **Caja & Cocina**, leé este documento para ubicar exactamente qué archivo tocar sin leer todo el proyecto. Está terminantemente prohibido volver a concentrar lógica en un archivo monolítico.

---

## 1. Visión Arquitectónica: Arquitectura Limpia en 3 Capas (`src/`)

La aplicación sigue una **Arquitectura en 3 Capas (Clean / Layered Architecture)** usando **ES Modules nativos** (`type="module"`), sin dependencias externas ni pasos de compilación (buildless), garantizando **bajo acoplamiento** y **alta cohesión**.

### Regla de Dependencia Unidireccional
$$\text{UI (`src/ui/`)} \longrightarrow \text{Data / Store (`src/data/`)} \longrightarrow \text{Domain (`src/domain/`)}$$

1. **`src/domain/` (Capa de Dominio y Reglas de Negocio):**
   - Contiene **funciones puras** de negocio (contabilidad de los 3 bolsillos, costeo de recetas, clasificador inteligente de WhatsApp, formateadores).
   - **PROHIBIDO** usar `document`, `window`, `localStorage` o `fetch` dentro de `src/domain/`.
2. **`src/data/` (Capa de Datos, Estado y Servicios Externos):**
   - Gestiona el estado en memoria (`store.js`), persistencia en `localStorage`, datos semilla (`seed.js`), sincronización en tiempo real con Firebase (`cloudSync.js`) y llamadas HTTP a la API de Google Gemini (`geminiClient.js`).
   - Puede importar de `src/domain/`, pero **PROHIBIDO** manipular vistas o formularios del DOM directamente (se comunica con la UI mediante callbacks/suscripciones registradas).
3. **`src/ui/` (Capa de Presentación y Controladores de Vista):**
   - Cada pestaña o componente visual de la aplicación tiene **su propio archivo dedicado**.
   - Lee datos a través de `src/data/store.js`, invoca reglas de `src/domain/` y actualiza exclusivamente su sección del DOM.

---

## 2. Mapa de Archivos por Responsabilidad (Dónde tocar según el cambio)

Si el usuario pide un cambio puntual, **buscá y abrí únicamente el archivo correspondiente** de esta tabla:

| Si necesitás modificar... | Archivo exacto a editar | Capa |
| :--- | :--- | :--- |
| **Fórmula de los 3 Bolsillos**, cálculo de KPIs, filtros de fecha/semana/mes o diagnóstico local | [`src/domain/ledger.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/domain/ledger.js) | Dominio |
| **Clasificador inteligente de gastos (WhatsApp)**, detección de montos abreviados (`"60 a mami"`) o kilos | [`src/domain/classifier.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/domain/classifier.js) | Dominio |
| **Cálculo de costo de recetas** o porcentaje de margen de ganancia por producto | [`src/domain/costing.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/domain/costing.js) | Dominio |
| **Formato de moneda ARS (`$XX.XXX`)**, fechas ISO, horas o conversión Markdown | [`src/domain/formatters.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/domain/formatters.js) | Dominio |
| **Precios iniciales, recetas por defecto o registros históricos de Octubre** | [`src/data/seed.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/data/seed.js) | Datos |
| **Estado global (`state`), carrito borrador (`draftCart`), `localStorage`** o sesión de operador | [`src/data/store.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/data/store.js) | Datos |
| **Sincronización en vivo con Firebase (`EventSource`)** o fusión de conflictos (`mergeThreeWay`) | [`src/data/cloudSync.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/data/cloudSync.js) | Datos |
| **Conexión con Google Gemini IA**, autodetección de modelos `Flash` o prompt del consultor | [`src/data/geminiClient.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/data/geminiClient.js) | Datos |
| **Banda superior de 4 KPIs, Árbol de Bolsillos o Calculadora de turno de Heber** | [`src/ui/headerKpisView.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/ui/headerKpisView.js) | UI |
| **Anotador de Tandas de Venta, Gráfico semanal o Tabla de movimientos del día + barra rápida** | [`src/ui/overviewView.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/ui/overviewView.js) | UI |
| **Pestaña de Gastos**, formulario detallado de egresos o gráfico de compromisos (Iglesia/Casa) | [`src/ui/expensesView.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/ui/expensesView.js) | UI |
| **Pestaña de Insumos y Recetas**, edición en línea de precios/costos o Modal de Producto | [`src/ui/costsView.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/ui/costsView.js) | UI |
| **Pestaña de Lista de Compras y Tareas de producción** | [`src/ui/notesView.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/ui/notesView.js) | UI |
| **Pestaña del Consultor IA y Simulador de Cuotas** | [`src/ui/advisorView.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/ui/advisorView.js) | UI |
| **Modal de Sincronización Nube y Exportar/Importar `.json`** | [`src/ui/syncModalView.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/ui/syncModalView.js) | UI |
| **Menú lateral, cambio de pestañas, selector de operador (`Jonatan`/`Benja`) o fecha activa** | [`src/ui/navigation.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/ui/navigation.js) | UI |
| **Notificaciones emergentes (`showToast`)** | [`src/ui/toast.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/ui/toast.js) | UI |
| **Inicialización general de la app y registro del Service Worker** | [`src/main.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/src/main.js) | Entrypoint |
| ** Primitivas de gráficos SVG (`Charts.bars`, `Charts.plan`, `Charts.barList`)** | [`charts.js`](file:///c:/Users/Chouni/.gemini/antigravity/scratch/gastro-caja/charts.js) | UI / Charts |

---

## 3. Convenciones de Código Limpio (Clean Code)

### 3.1 Tamaño y Cohesión de Archivos y Funciones
- **Límite por archivo:** Ningún módulo funcional en `src/` debe superar las **300 líneas** (con excepción de `src/data/seed.js` por contener el historial real de Octubre). Si un archivo crece más allá de eso, dividilo en submódulos cohesivos.
- **Límite por función:** Las funciones deben hacer **una sola cosa (Single Responsibility Principle)** y mantenerse idealmente por debajo de **45 líneas**.
- **Exportaciones explícitas (Named Exports):** Usá siempre `export function nombreFuncion()` o `export const CONSTANTE`. Evitá `export default` para mantener nombres consistentes al importar.

### 3.2 Nomenclatura Estándar
- **Archivos:** `camelCase.js` descriptivo de su responsabilidad (ej. `headerKpisView.js`, `cloudSync.js`).
- **Funciones de Dominio:** Verbos claros orientados al cálculo o transformación (`calculateProductCost`, `classifyExpenseText`, `getMetricsForPeriod`).
- **Funciones de Vista (`src/ui/`):**
  - `render<Nombre>Screen()` o `render<Componente>()` para actualizar el DOM a partir del estado.
  - `bind<Nombre>Events()` para registrar los `addEventListener` una única vez al iniciar la aplicación.
- **Constantes globales/configuración:** `UPPER_SNAKE_CASE` (`STORAGE_KEY`, `CLOUD_PATH`, `DEVICE_META_KEYS`).
- **Variables y propiedades:** `camelCase` en inglés para código estructural (`grossSales`, `cogsSold`, `netFreeProfit`, `draftCart`), respetando los términos de dominio en español en textos visibles al usuario (`Jonatan`, `Benja`, `Heber`, `Tanda`).

### 3.3 Gestión del Estado e Inmutabilidad Contable
- **Lectura/Escritura centralizada:** Todo cambio persistente en ventas, gastos, insumos, productos o listas se realiza a través de `store.state` seguido de `saveState()` (exportado por `src/data/store.js`).
- **Invariante Contable ("Los 3 Bolsillos"):**
  $$\text{netFreeProfit} = \text{grossSales} - \text{cogsSold} - \text{operatingExpenses}$$
  Donde `cogsSold` es el costo de receta congelado al momento de cada venta y `operatingExpenses` excluye `Mercadería / Insumos` y `Descartables / Cajas` (para no descontar dos veces la mercadería).
- **Preservación de Credenciales Locales:** `gastro_gemini_key`, `gastro_gemini_model` y `gastro_firebase_url` se guardan en claves dedicadas de `localStorage` y están en `DEVICE_META_KEYS` para que nunca se pisen ni se borren al sincronizar con la nube.

---

## 4. Reglas Estrictas de UI y Linter (`achromatic-ledger` / `taste-skill`)

1. **CERO Emojis en código o textos UI (`[no-emoji]`):** Prohibido usar emojis en `.html`, `.css` o `.js`.
2. **CERO Guiones Largos Literales (`—`) en strings de JS:** El linter cuenta los `—` (em-dashes) en todos los archivos. En código JS usá el escape Unicode `\u2014` (para guion largo) o `\u2212` (para signo menos matemático) o punto medio `·`.
3. **Números Tabulares:** Todo monto, porcentaje, cantidad o fecha en el DOM debe tener la clase `.num` (`font-variant-numeric: tabular-nums`).
4. **CERO Sombras en Reposo:** Paneles y tarjetas llevan `box-shadow: none` y bordes hairline `1px solid var(--border)`.
5. **Service Worker (`sw.js`):** Si agregás o renombrás un archivo en `src/`, incluilo en el array `ASSETS` de `sw.js` e incrementá `CACHE_NAME` para que el modo Offline-First funcione sin fallos.

---

## 5. Flujo de Trabajo para Modificaciones Futuras (Checklist para Agentes)

1. **Identificar archivo en la Tabla de la Sección 2:** No leas todos los archivos de `src/`; abrí solo el módulo afectado.
2. **Aplicar el cambio respetando la separación de capas:**
   - Si es una regla contable o de clasificación $\rightarrow$ editá `src/domain/`.
   - Si es persistencia, Firebase o API Gemini $\rightarrow$ editá `src/data/`.
   - Si es interfaz, tabla, botón o modal $\rightarrow$ editá el archivo específico en `src/ui/`.
3. **Verificar que nada se haya roto (Ejecución obligatoria):**
   ```powershell
   # 1. Linter estático sobre HTML, CSS y todos los módulos de src/
   node "C:\Users\Chouni\.gemini\config\skills\taste-skill\scripts\lint.mjs" --app index.html styles.css charts.js src

   # 2. Inspector en navegador real (1440px, 768px, 390px)
   node "C:\Users\Chouni\.gemini\config\skills\taste-skill\scripts\inspect.mjs" --app index.html

   # 3. Limpiar carpeta temporal de inspección
   Remove-Item -Recurse -Force .taste-skill -ErrorAction SilentlyContinue
   ```
   Ambos comandos deben devolver **`RESULT: 0 FAIL, 0 WARN`**.
