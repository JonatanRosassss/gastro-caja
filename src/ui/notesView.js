// ============================================================================
// CAPA DE UI: Pantalla 4 (Lista de Compras y Tareas de Producción)
// Responsabilidad única: Renderizar y gestionar listas compartidas entre
// Jonatan y Benja, incluyendo conversión de compra pendiente a gasto en 1 clic.
// ============================================================================

import { getCurrentTimeHHMM } from '../domain/formatters.js';
import { classifyExpenseText } from '../domain/classifier.js';
import { store, saveState } from '../data/store.js';
import { showToast } from './toast.js';

export function renderNotesScreen() {
  const { state } = store;
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

export function bindNotesEvents({ onRenderAll }) {
  document.getElementById('formAddBuy').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('inputBuyText');
    if (!input.value.trim()) return;
    store.state.buyList.unshift({
      id: 'buy_' + Date.now(),
      text: input.value.trim(),
      done: false,
      operator: store.currentOperator
    });
    input.value = '';
    saveState();
    renderNotesScreen();
  });

  document.getElementById('formAddTodo').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('inputTodoText');
    if (!input.value.trim()) return;
    store.state.todoList.unshift({
      id: 'todo_' + Date.now(),
      text: input.value.trim(),
      done: false,
      operator: store.currentOperator
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
      const item = store.state.buyList.find(x => x.id === toExp.dataset.buyToExpense);
      if (!item) return;
      const val = Number(prompt(`Monto pagado por "${item.text}" ($):`, ''));
      if (val > 0) {
        item.done = true;
        const parsed = classifyExpenseText(item.text);
        store.state.expenses.push({
          id: 'exp_' + Date.now(),
          date: store.activeDate,
          time: getCurrentTimeHHMM(),
          operator: store.currentOperator,
          category: parsed.category,
          description: item.text,
          amount: Math.round(val)
        });
        saveState();
        onRenderAll();
        showToast(`Compra registrada en ${parsed.category}`);
      }
    } else if (del) {
      store.state.buyList = store.state.buyList.filter(x => x.id !== del.dataset.delBuy);
      saveState();
      renderNotesScreen();
    } else if (toggle) {
      const item = store.state.buyList.find(x => x.id === toggle.dataset.toggleBuy);
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
      store.state.todoList = store.state.todoList.filter(x => x.id !== del.dataset.delTodo);
      saveState();
      renderNotesScreen();
    } else if (toggle) {
      const item = store.state.todoList.find(x => x.id === toggle.dataset.toggleTodo);
      if (item) {
        item.done = !item.done;
        saveState();
        renderNotesScreen();
      }
    }
  });
}
