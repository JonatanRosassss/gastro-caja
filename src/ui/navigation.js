// ============================================================================
// CAPA DE UI: Navegación, Selector de Operador, Fecha/Período y Render Maestro
// Responsabilidad única: Coordinar el cambio de pantallas, el selector de
// operador (Jonatan/Benja), los filtros temporales y el refresco de vistas.
// ============================================================================

import { store } from '../data/store.js';
import { showToast } from './toast.js';
import { renderHeaderAndKpis } from './headerKpisView.js';
import {
  renderOverviewRightColumn,
  renderWeeklyChart,
  renderTodayMovementsTable
} from './overviewView.js';
import { renderExpensesScreen } from './expensesView.js';
import { renderCostsScreen } from './costsView.js';
import { renderNotesScreen } from './notesView.js';
import { renderAdvisorScreen } from './advisorView.js';

const SCREEN_TITLES = {
  'screen-overview': 'Caja y tandas del día',
  'screen-expenses': 'Gastos, alquiler y aportes a la iglesia',
  'screen-costs': 'Insumos variables y costeo de recetas',
  'screen-notes': 'Lista de compras y tareas de producción',
  'screen-advisor': 'Consultor financiero y simulador de cuotas'
};

export function renderAllViews() {
  renderHeaderAndKpis();
  renderOverviewRightColumn();
  renderExpensesScreen();
  renderCostsScreen();
  renderNotesScreen();
  renderAdvisorScreen();
}

export function bindNavigationEvents() {
  const dateInput = document.getElementById('activeDateInput');
  dateInput.value = store.activeDate;
  dateInput.addEventListener('change', e => {
    if (e.target.value) {
      store.activeDate = e.target.value;
      renderAllViews();
    }
  });

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
      document.getElementById('screenTitle').textContent =
        SCREEN_TITLES[target] || 'Caja y tandas';
      sidebar.classList.remove('open');
      closeBtn.style.display = 'none';
      renderAllViews();
    });
  });

  document.querySelectorAll('.op-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      store.currentOperator = btn.dataset.operator;
      document.getElementById('activeOperatorBadge').textContent = store.currentOperator;
      document.querySelectorAll('.op-switch-btn').forEach(b => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      showToast(`Operador activo: ${store.currentOperator}`);
    });
  });

  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      store.currentPeriod = btn.dataset.period;
      document.querySelectorAll('.period-btn').forEach(b => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      renderHeaderAndKpis();
      renderTodayMovementsTable();
    });
  });

  window.addEventListener('resize', () => {
    renderWeeklyChart();
    renderExpensesScreen();
  });
}
