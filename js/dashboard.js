/**
 * FONDACIO COLOMBIA - SISTEMA DE INVENTARIO
 * Módulo de Dashboard: Analítica, Métricas y Gráficos
 */

let chartSedesInstance = null;
let chartCategoriesInstance = null;

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount);
}

function renderDashboard() {
  const stats = DB.getDashboardStats();

  // Actualizar contadores numéricos
  const elTotal = document.getElementById('dash-total-assets');
  const elOperativos = document.getElementById('dash-operativos-assets');
  const elPrestados = document.getElementById('dash-prestados-assets');
  const elMaint = document.getElementById('dash-maint-assets');
  const elValue = document.getElementById('dash-total-value');

  if (elTotal) elTotal.textContent = stats.total;
  if (elOperativos) {
    const pct = stats.total > 0 ? Math.round((stats.operativos / stats.total) * 100) : 0;
    elOperativos.textContent = `${stats.operativos} (${pct}%)`;
  }
  if (elPrestados) elPrestados.textContent = stats.prestados;
  if (elMaint) elMaint.textContent = stats.mantenimiento;
  if (elValue) elValue.textContent = formatCurrency(stats.totalValue);

  // Actualizar badges de menú lateral
  const badgeInv = document.getElementById('badge-count-inventory');
  const badgeLoans = document.getElementById('badge-count-loans');
  const badgeMaint = document.getElementById('badge-count-maint');
  if (badgeInv) badgeInv.textContent = stats.total;
  if (badgeLoans) badgeLoans.textContent = stats.activeLoansCount;
  if (badgeMaint) badgeMaint.textContent = stats.pendingMaintCount;

  // Renderizar gráficos
  renderCharts(stats);

  // Renderizar resumen de sedes
  renderSedesSummary(stats);

  // Renderizar actividades / alertas recientes
  renderRecentActivities();
}

function renderCharts(stats) {
  // Gráfico 1: Distribución por Sede
  const ctxSedes = document.getElementById('chartSedes');
  if (ctxSedes) {
    if (chartSedesInstance) chartSedesInstance.destroy();

    const sedeLabels = Object.keys(stats.bySede).filter(k => stats.bySede[k] > 0);
    const sedeData = sedeLabels.map(k => stats.bySede[k]);

    chartSedesInstance = new Chart(ctxSedes, {
      type: 'doughnut',
      data: {
        labels: sedeLabels,
        datasets: [{
          data: sedeData,
          backgroundColor: [
            '#2e7d32', // Fondacio Green
            '#f59e0b', // Amber/Ecology
            '#1565c0', // Blue
            '#8b5cf6'  // Purple
          ],
          borderWidth: 2,
          borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#141f18' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { family: 'Plus Jakarta Sans', size: 12 },
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#cbd5e1' : '#475569'
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  // Gráfico 2: Categorías de Hardware
  const ctxCategories = document.getElementById('chartCategories');
  if (ctxCategories) {
    if (chartCategoriesInstance) chartCategoriesInstance.destroy();

    const catLabels = Object.keys(stats.byCategory).filter(k => stats.byCategory[k] > 0);
    const catData = catLabels.map(k => stats.byCategory[k]);

    chartCategoriesInstance = new Chart(ctxCategories, {
      type: 'bar',
      data: {
        labels: catLabels,
        datasets: [{
          label: 'Cantidad de Equipos',
          data: catData,
          backgroundColor: '#2e7d32',
          borderRadius: 6,
          maxBarThickness: 36
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: { family: 'Plus Jakarta Sans' },
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#64748b'
            },
            grid: {
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            }
          },
          x: {
            ticks: {
              font: { family: 'Plus Jakarta Sans', size: 11 },
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#64748b'
            },
            grid: { display: false }
          }
        }
      }
    });
  }
}

function renderSedesSummary(stats) {
  const container = document.getElementById('dashboard-sedes-list');
  if (!container) return;

  const sedes = DB.getSedes();

  container.innerHTML = sedes.map(sede => {
    const totalInSede = stats.bySede[sede.name] || 0;
    return `
      <div class="sede-card">
        <div class="sede-card-top">
          <div class="sede-card-title">
            <span class="dot" style="background-color: ${sede.color || '#4caf50'}"></span>
            ${escapeHtml(sede.name)}
          </div>
          <span class="asset-code-badge">${totalInSede} equipos</span>
        </div>
        <p style="font-size: 0.74rem; color: var(--text-secondary); margin-bottom: 0.4rem;">
          📍 <strong>${escapeHtml(sede.address)}</strong> (${escapeHtml(sede.city)}) • <em>${escapeHtml(sede.focus || 'Sede Fondacio')}</em>
        </p>
        <div class="sede-stats-row">
          <span>Código: <strong>${escapeHtml(sede.code || 'SEDE')}</strong></span>
          <button class="btn btn-sm btn-secondary" onclick="filterBySedeAndGo('${escapeHtml(sede.name)}')" style="margin-left: auto;">
            Ver Activos
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderRecentActivities() {
  const container = document.getElementById('dashboard-activities-list');
  if (!container) return;

  const loans = DB.getLoans('activo');
  const maint = DB.getMaintenances('en_progreso').concat(DB.getMaintenances('programado'));
  const recentAssets = DB.getAssets().slice(0, 3);

  let items = [];

  maint.forEach(m => {
    items.push(`
      <div class="activity-item" style="border-left-color: var(--accent-amber);">
        <div class="activity-icon" style="color: var(--accent-amber);">
          <i data-lucide="wrench"></i>
        </div>
        <div class="activity-content">
          <h4>Mantenimiento en curso: ${m.assetName}</h4>
          <p>${m.description || 'Revisión técnica'} • Responsable: ${m.technician || 'Soporte'}</p>
          <div class="activity-time">Código: ${m.assetCode}</div>
        </div>
      </div>
    `);
  });

  loans.forEach(l => {
    items.push(`
      <div class="activity-item" style="border-left-color: var(--secondary-500);">
        <div class="activity-icon" style="color: var(--secondary-500);">
          <i data-lucide="handshake"></i>
        </div>
        <div class="activity-content">
          <h4>Préstamo activo: ${l.assetName}</h4>
          <p>Custodio: <strong>${l.borrowerName}</strong> (${l.borrowerRole}) • Devolución: ${l.expectedReturnDate}</p>
          <div class="activity-time">Sede: ${l.sede}</div>
        </div>
      </div>
    `);
  });

  if (items.length === 0) {
    items.push(`
      <p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1.5rem 0;">
        No hay alertas ni mantenimientos pendientes en este momento.
      </p>
    `);
  }

  container.innerHTML = items.join('');
  if (window.lucide) lucide.createIcons();
}

function filterBySedeAndGo(sedeName) {
  navigateTo('inventario');
  const filterEl = document.getElementById('filter-sede');
  if (filterEl) {
    filterEl.value = sedeName;
    applyInventoryFilters();
  }
}
