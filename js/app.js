/**
 * FONDACIO COLOMBIA - SISTEMA DE INVENTARIO
 * Controlador Principal de la Aplicación (SPA Router, Modales, Tema, Respaldos)
 */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Inicializar Tema y Personalizador
  initTheme();
  initCustomizerModule();

  // Inicializar Navegación
  initNavigation();

  // Inicializar Módulos
  initSedesModule();
  initInventoryModule();
  initLoansModule();
  initMaintenanceModule();
  initDiagnosticoModule();
  initBackupModule();

  // Cargar vista inicial
  navigateTo('dashboard');

  // Inicializar Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Búsqueda global del Topbar
  const topSearch = document.getElementById('global-search-input');
  if (topSearch) {
    topSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (query) {
          navigateTo('inventario');
          const invSearch = document.getElementById('inventory-search-input');
          if (invSearch) {
            invSearch.value = query;
            applyInventoryFilters();
          }
        }
      }
    });
  }

  // Atajos de teclado interactivos
  document.addEventListener('keydown', (e) => {
    // Ctrl + K o / para enfocar búsqueda
    if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
      e.preventDefault();
      const s = document.getElementById('global-search-input');
      if (s) s.focus();
    }
    // Esc para cerrar modales abiertos
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
    }
  });

  // Listener para cerrar modales al hacer clic en el backdrop
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });
}

// --- NAVEGACIÓN SPA ---
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-view]');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      navigateTo(view);
      
      // Cerrar sidebar en móvil si está abierto
      document.querySelector('.sidebar')?.classList.remove('mobile-open');
    });
  });

  // Botón móvil
  const mobileToggle = document.getElementById('mobile-toggle-btn');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.toggle('mobile-open');
    });
  }
}

function navigateTo(viewId) {
  // Actualizar clases activas en navegación
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-view') === viewId);
  });

  // Ocultar todas las secciones y mostrar la activa
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const targetSection = document.getElementById(`view-${viewId}`);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Título del header
  const titleMap = {
    dashboard: { title: 'Panel de Control y Analítica', sub: 'Métricas de activos de hardware en sedes Fondacio Colombia' },
    inventario: { title: 'Inventario de Equipos y Hojas de Vida', sub: 'Registro detallado, especificaciones, placas y códigos QR' },
    sedes: { title: 'Gestión de Sedes y Espacios Físicos', sub: 'Administración de sedes operativas, direcciones y contactos' },
    prestamos: { title: 'Asignaciones y Préstamos', sub: 'Control de custodios, beneficiarios y actas de entrega' },
    mantenimiento: { title: 'Mantenimientos y Soporte Técnico', sub: 'Bitácora técnica, servicios preventivos y correctivos' },
    diagnostico: { title: 'Diagnóstico de Software, Licencias y Tablets', sub: 'Auditoría de sistemas operativos, activación, parches y mitigación de obsolescencia' },
    respaldo: { title: 'Respaldos y Configuración', sub: 'Copia de seguridad, exportación y restauración de datos' }
  };

  const meta = titleMap[viewId] || titleMap.dashboard;
  document.getElementById('header-title').textContent = meta.title;
  document.getElementById('header-subtitle').textContent = meta.sub;

  // Renderizar contenido según la vista
  if (viewId === 'dashboard') {
    renderDashboard();
  } else if (viewId === 'inventario') {
    applyInventoryFilters();
  } else if (viewId === 'sedes') {
    renderSedesList();
  } else if (viewId === 'prestamos') {
    renderLoansList();
  } else if (viewId === 'mantenimiento') {
    renderMaintenanceList();
  } else if (viewId === 'diagnostico') {
    renderDiagnosticoView();
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

// --- GESTIÓN DE MODALES ---
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (window.lucide) lucide.createIcons();
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// --- TEMA OSCURO / CLARO ---
function initTheme() {
  const savedTheme = localStorage.getItem('fondacio_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  const themeToggle = document.getElementById('theme-toggle-btn');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('fondacio_theme', nextTheme);
      updateThemeIcon(nextTheme);
      renderDashboard(); // refrescar colores de charts
    });
  }
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
    if (window.lucide) lucide.createIcons();
  }
}

// --- NOTIFICACIONES TOAST ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
  
  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- RESPALDO, IMPORTACIÓN Y EXPORTACIÓN ---
function initBackupModule() {
  const btnExportJson = document.getElementById('btn-export-json');
  const fileImportInput = document.getElementById('file-import-json');
  const btnResetData = document.getElementById('btn-reset-data');

  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      const json = DB.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Respaldo_Inventario_Fondacio_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Copia de respaldo JSON generada y descargada.', 'success');
    });
  }

  if (fileImportInput) {
    fileImportInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const res = DB.importJSON(event.target.result);
        if (res.success) {
          showToast(`Datos restaurados con éxito (${res.count} activos).`, 'success');
          renderDashboard();
          applyInventoryFilters();
        } else {
          showToast(`Error al importar: ${res.message}`, 'error');
        }
      };
      reader.readAsText(file);
      fileImportInput.value = '';
    });
  }

  if (btnResetData) {
    btnResetData.addEventListener('click', () => {
      if (confirm('⚠️ ¿Estás seguro de que deseas restablecer la base de datos a los valores iniciales de demostración de Fondacio Colombia? Todos los cambios manuales se sobreescribirán.')) {
        DB.resetToInitial();
        showToast('Base de datos restablecida a los valores iniciales de Fondacio.', 'info');
        renderDashboard();
        applyInventoryFilters();
      }
    });
  }
}
