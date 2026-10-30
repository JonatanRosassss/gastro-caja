// ============================================================================
// CAPA DE UI: Pantalla 3 (Insumos Variables, Costeo de Recetas y Modal)
// Responsabilidad única: Renderizar la tabla de insumos, la tabla de rentabilidad
// de productos con edición en línea y el modal de edición/creación de recetas.
// ============================================================================

import { formatARS } from '../domain/formatters.js';
import { calculateProductCost, getProductMarginPercent } from '../domain/costing.js';
import { store, saveState, getIngredientById } from '../data/store.js';
import { showToast } from './toast.js';

export function renderCostsScreen() {
  const { state } = store;
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
    const cost = calculateProductCost(prod, state.ingredients);
    const profit = prod.price - cost;
    const margin = getProductMarginPercent(prod, state.ingredients);
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

function openProductModal(prodId) {
  const modal = document.getElementById('modalProduct');
  const rows = document.getElementById('modalRecipeRows');
  rows.innerHTML = '';

  const prod = store.state.products.find(p => p.id === prodId);
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
    addRecipeRowElement(store.state.ingredients[0]?.id || '', 1);
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
  const opts = store.state.ingredients
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

export function bindCostsEvents({ onRenderAll }) {
  document.getElementById('ingredientsTableBody').addEventListener('change', e => {
    const input = e.target.closest('[data-ing-input]');
    if (!input) return;
    const ing = getIngredientById(input.dataset.ingInput);
    if (ing) {
      ing.price = Math.max(0, Number(input.value) || 0);
      saveState();
      onRenderAll();
      showToast(`Costo de ${ing.name} actualizado`);
    }
  });

  document.getElementById('btnNewIngredient').addEventListener('click', () => {
    const name = prompt('Nombre del insumo:');
    if (!name) return;
    const unit = prompt('Unidad (kg, litro, unid):', 'kg') || 'unid';
    const price = Number(prompt(`Costo actual por ${unit} ($):`, '2500')) || 0;
    store.state.ingredients.push({
      id: 'ing_' + Date.now(),
      name: name.trim(),
      unit: unit.trim(),
      price
    });
    saveState();
    onRenderAll();
  });

  document.getElementById('productsCostTableBody').addEventListener('change', e => {
    const priceInput = e.target.closest('[data-prod-price-input]');
    if (!priceInput) return;
    const prod = store.state.products.find(p => p.id === priceInput.dataset.prodPriceInput);
    if (prod) {
      prod.price = Math.max(0, Number(priceInput.value) || 0);
      saveState();
      onRenderAll();
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
    addRecipeRowElement(store.state.ingredients[0]?.id || '', 1);
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
      const prod = store.state.products.find(p => p.id === id);
      if (prod) {
        prod.name = name;
        prod.category = category;
        prod.price = price;
        prod.recipe = recipe;
      }
    } else {
      store.state.products.push({
        id: 'prod_' + Date.now(),
        name,
        category,
        price,
        recipe
      });
      store.activeCatFilter = 'all';
      document.querySelectorAll('.cat-filter-btn').forEach(b => {
        b.setAttribute('aria-pressed', String(b.dataset.cat === 'all'));
      });
    }
    saveState();
    closeProductModal();
    onRenderAll();
    showToast('Producto guardado y visible en el inicio');
  });

  document.getElementById('btnDeleteProduct').addEventListener('click', () => {
    const id = document.getElementById('modalProdId').value;
    if (!id) return;
    store.state.products = store.state.products.filter(p => p.id !== id);
    saveState();
    closeProductModal();
    onRenderAll();
  });
}
