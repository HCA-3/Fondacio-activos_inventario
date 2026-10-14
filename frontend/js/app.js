/**
 * FONDACIO COLOMBIA - SISTEMA DE INVENTARIO
 * Controlador Principal de la Aplicación (Autenticación, Sesión, SPA Router, Modales, Tema)
 */

document.addEventListener('DOMContentLoaded', () => {
  setupAuthEventListeners();
  checkAuthAndInit();
});

// --- AUTENTICACIÓN Y CONTROL DE SESIÓN ---

function setupAuthEventListeners() {
  const loginForm = document.getElementById('form-login');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginFormSubmit);
  }

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

async function checkAuthAndInit() {
  // Inicializar Tema visual por defecto
  initTheme();

  try {
    const user = await DB.getMe();
    setupAuthenticatedUser(user);
    ocultarLogin();
    initApp();
  } catch (err) {
    // Si no hay sesión o responde 401, mostrar la pantalla de login
    mostrarLogin();
  }
}

function mostrarLogin(errorMessage = '') {
  const overlay = document.getElementById('login-overlay');
  const errorBox = document.getElementById('login-error-msg');
  if (overlay) {
    overlay.style.display = 'flex';
  }
  if (errorBox) {
    if (errorMessage) {
      errorBox.textContent = errorMessage;
      errorBox.style.display = 'block';
    } else {
      errorBox.textContent = '';
      errorBox.style.display = 'none';
    }
  }
  const userInput = document.getElementById('login-username');
  if (userInput) {
    userInput.focus();
  }
}

function ocultarLogin() {
  const overlay = document.getElementById('login-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

function setupAuthenticatedUser(user) {
  if (!user) return;
  DB.setCurrentUser(user);

  const nameEl = document.getElementById('user-display-name');
  const roleEl = document.getElementById('user-display-role');
  const settingsUserEl = document.getElementById('settings-user-display');
  if (nameEl) nameEl.textContent = user.name || user.username;
  if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Administrador' : 'Consulta';
  if (settingsUserEl) settingsUserEl.textContent = `${user.username} (${user.role === 'admin' ? 'Administrador' : 'Consulta'})`;

  // Control de interfaz por roles
  if (user.role === 'consulta') {
    document.body.classList.add('role-consulta');
  } else {
    document.body.classList.remove('role-consulta');
  }
}

async function handleChangePasswordSubmit(e) {
  e.preventDefault();
  const newPassInput = document.getElementById('setting-new-password');
  const confirmPassInput = document.getElementById('setting-confirm-password');
  const alertEl = document.getElementById('pwd-change-alert');
  const submitBtn = document.getElementById('btn-save-password');

  const newPass = newPassInput ? newPassInput.value : '';
  const confirmPass = confirmPassInput ? confirmPassInput.value : '';

  if (alertEl) {
    alertEl.style.display = 'none';
  }

  if (!newPass || newPass.length < 8) {
    const msg = 'La nueva contraseña debe tener al menos 8 caracteres.';
    showToast(msg, 'warning');
    if (alertEl) {
      alertEl.style.background = 'rgba(239, 68, 68, 0.15)';
      alertEl.style.color = '#dc2626';
      alertEl.textContent = msg;
      alertEl.style.display = 'block';
    }
    return;
  }

  if (newPass !== confirmPass) {
    const msg = 'Las contraseñas no coinciden. Por favor verifica.';
    showToast(msg, 'warning');
    if (alertEl) {
      alertEl.style.background = 'rgba(239, 68, 68, 0.15)';
      alertEl.style.color = '#dc2626';
      alertEl.textContent = msg;
      alertEl.style.display = 'block';
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Actualizando...</span>';
  }

  try {
    const res = await DB.changePassword(newPass);
    const msg = (res && res.mensaje) ? res.mensaje : '✓ Contraseña actualizada exitosamente en el servidor.';
    showToast(msg, 'success');
    if (alertEl) {
      alertEl.style.background = 'rgba(16, 185, 129, 0.15)';
      alertEl.style.color = '#059669';
      alertEl.textContent = msg;
      alertEl.style.display = 'block';
    }
    const form = document.getElementById('form-change-password');
    if (form) form.reset();
  } catch (err) {
    const errorMsg = 'Error al cambiar contraseña: ' + (err.message || 'Error desconocido');
    showToast(errorMsg, 'error');
    if (alertEl) {
      alertEl.style.background = 'rgba(239, 68, 68, 0.15)';
      alertEl.style.color = '#dc2626';
      alertEl.textContent = errorMsg;
      alertEl.style.display = 'block';
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i data-lucide="lock"></i><span>Actualizar Contraseña</span>';
      if (window.lucide) lucide.createIcons();
    }
  }
}

async function handleLoginFormSubmit(e) {
  e.preventDefault();
  const userInput = document.getElementById('login-username');
  const passInput = document.getElementById('login-password');
  const submitBtn = document.getElementById('login-submit-btn');
  const errorBox = document.getElementById('login-error-msg');

  const username = userInput ? userInput.value.trim() : '';
  const password = passInput ? passInput.value : '';

  if (!username || !password) {
    mostrarLogin('Por favor ingresa usuario y contraseña.');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verificando...';
  }
  if (errorBox) {
    errorBox.style.display = 'none';
  }

  try {
    const user = await DB.login(username, password);
    setupAuthenticatedUser(user);
    ocultarLogin();
    if (passInput) passInput.value = '';
    initApp();
    showToast(`Bienvenido/a, ${user.name || user.username}`, 'success');
  } catch (err) {
    mostrarLogin(err.message || 'Error de autenticación');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Iniciar Sesión';
    }
  }
}

async function handleLogout() {
  if (!confirm('¿Deseas cerrar tu sesión actual en Fondacio Colombia?')) {
    return;
  }
  try {
    await DB.logout();
  } catch (e) {
    console.warn('Logout:', e.message);
  }
  document.body.classList.remove('role-consulta');
  mostrarLogin('Sesión cerrada correctamente.');
  showToast('Has cerrado sesión.', 'info');
}

// --- INICIALIZACIÓN DE LA APLICACIÓN ---

let appInitialized = false;

function initApp() {
  if (appInitialized) {
    // Si ya fue inicializada, refrescar vista actual
    navigateTo('dashboard');
    return;
  }
  appInitialized = true;

  // Inicializar Personalizador
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
    respaldo: { title: 'Base de Datos y Configuración', sub: 'Sincronización con el servidor central, exportación oficial y datos de la fundación' }
  };

  const meta = titleMap[viewId] || titleMap.dashboard;
  const headerTitle = document.getElementById('header-title');
  const headerSub = document.getElementById('header-subtitle');
  if (headerTitle) headerTitle.textContent = meta.title;
  if (headerSub) headerSub.textContent = meta.sub;

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
  } else if (viewId === 'respaldo') {
    renderSettingsView();
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
      if (typeof renderDashboard === 'function') {
        renderDashboard();
      }
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

// --- CONFIGURACIÓN Y EXPORTACIÓN OFICIAL ---
function initBackupModule() {
  const btnExportExcel = document.getElementById('btn-export-excel-server');
  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', () => {
      exportInventoryToExcel();
    });
  }

  const formChangePassword = document.getElementById('form-change-password');
  if (formChangePassword) {
    formChangePassword.addEventListener('submit', handleChangePasswordSubmit);
  }

  const formNewUser = document.getElementById('form-new-user');
  if (formNewUser) {
    formNewUser.addEventListener('submit', handleSaveNewUserForm);
  }
}

async function renderSettingsView() {
  try {
    const user = DB.currentUser;
    const settingsUserEl = document.getElementById('settings-user-display');
    if (user && settingsUserEl) {
      settingsUserEl.textContent = `${user.username} (${user.role === 'admin' ? 'Administrador' : 'Consulta'})`;
    }

    // El panel de gestión de usuarios solo se muestra al usuario 'admin'
    const userPanel = document.getElementById('panel-user-management');
    if (userPanel) {
      if (user && user.username === 'admin') {
        userPanel.style.display = 'block';
        renderUsersTable();
      } else {
        userPanel.style.display = 'none';
      }
    }

    const settings = await DB.getSettings();
    const orgNameEl = document.getElementById('settings-org-name');
    const nitEl = document.getElementById('settings-nit');
    const emailEl = document.getElementById('settings-email');
    const webEl = document.getElementById('settings-website');

    if (orgNameEl) orgNameEl.textContent = settings.orgName || 'Fundación Fondacio Colombia';
    if (nitEl) nitEl.textContent = settings.nit || '900.384.129-5';
    if (emailEl) emailEl.textContent = settings.email || 'contacto@fondacio-co.org';
    if (webEl) webEl.textContent = settings.website || 'fondaciocolombia.org';
  } catch (e) {
    console.warn('Error al cargar ajustes institucionales:', e);
  }
}

// --- GESTIÓN DE USUARIOS (SOLO USUARIO ADMIN) ---
function openNewUserModal() {
  const form = document.getElementById('form-new-user');
  if (form) form.reset();
  const alertEl = document.getElementById('new-user-error-alert');
  if (alertEl) {
    alertEl.textContent = '';
    alertEl.style.display = 'none';
  }
  openModal('modal-user-form');
}

async function handleSaveNewUserForm(e) {
  e.preventDefault();
  const userInput = document.getElementById('new-user-username');
  const nameInput = document.getElementById('new-user-name');
  const roleInput = document.getElementById('new-user-role');
  const passInput = document.getElementById('new-user-password');
  const alertEl = document.getElementById('new-user-error-alert');
  const submitBtn = document.getElementById('btn-submit-new-user');

  const username = userInput ? userInput.value.trim().toLowerCase() : '';
  const name = nameInput ? nameInput.value.trim() : '';
  const role = roleInput ? roleInput.value : 'consulta';
  const password = passInput ? passInput.value : '';

  if (!username || !name || !password) {
    if (alertEl) {
      alertEl.textContent = 'Por favor completa todos los campos obligatorios.';
      alertEl.style.display = 'block';
    }
    return;
  }

  if (password.length < 8) {
    if (alertEl) {
      alertEl.textContent = 'La contraseña debe tener al menos 8 caracteres.';
      alertEl.style.display = 'block';
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Creando usuario...</span>';
  }

  try {
    await DB.createUser({ username, name, role, password });
    closeModal('modal-user-form');
    showToast(`Usuario '${username}' creado con éxito.`, 'success');
    renderUsersTable();
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Error al crear el usuario.';
      alertEl.style.display = 'block';
    }
    showToast('Error: ' + err.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i data-lucide="check"></i><span>Crear Usuario</span>';
      if (window.lucide) lucide.createIcons();
    }
  }
}

async function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  try {
    const res = await DB.getUsers(100, 0);
    const users = res.items || [];

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 1.5rem;">No hay usuarios registrados.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => {
      const isCurrent = DB.currentUser && DB.currentUser.username === u.username;
      const isAdminUser = u.username === 'admin';
      const roleBadge = u.role === 'admin'
        ? '<span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #2563eb; font-weight: 700; padding: 2px 8px; border-radius: 999px;">Administrador</span>'
        : '<span class="badge" style="background: rgba(107, 114, 128, 0.15); color: #4b5563; font-weight: 600; padding: 2px 8px; border-radius: 999px;">Consulta</span>';

      const statusBadge = u.active
        ? '<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #059669; font-weight: 700; padding: 2px 8px; border-radius: 999px;">● Activo</span>'
        : '<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #dc2626; font-weight: 700; padding: 2px 8px; border-radius: 999px;">○ Inactivo</span>';

      const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-CO') : '-';

      const toggleAction = (isCurrent || isAdminUser)
        ? '<span style="font-size: 0.75rem; color: var(--text-secondary); font-style: italic;">Principal</span>'
        : `<button type="button" class="btn btn-sm ${u.active ? 'btn-outline-danger' : 'btn-secondary'}" onclick="toggleUserStatus('${u.id}', '${escapeHtml(u.username)}', ${u.active})" style="font-size: 0.75rem; padding: 2px 8px;">
            ${u.active ? 'Desactivar' : 'Activar'}
          </button>`;

      return `
        <tr style="border-bottom: 1px solid var(--border-subtle);">
          <td style="padding: 10px 12px; font-weight: 700;">
            ${escapeHtml(u.username)} ${isCurrent ? '<span style="font-size: 0.7rem; color: var(--primary-600); font-weight: 600;">(Tú)</span>' : ''}
          </td>
          <td style="padding: 10px 12px;">${escapeHtml(u.name || '-')}</td>
          <td style="padding: 10px 12px;">${roleBadge}</td>
          <td style="padding: 10px 12px;">${statusBadge}</td>
          <td style="padding: 10px 12px; color: var(--text-secondary);">${dateStr}</td>
          <td style="padding: 10px 12px; text-align: right;">${toggleAction}</td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #dc2626; padding: 1.5rem;">Error al cargar usuarios: ${escapeHtml(err.message)}</td></tr>`;
  }
}

async function toggleUserStatus(userId, username, currentActive) {
  const actionText = currentActive ? 'desactivar' : 'activar';
  if (!confirm(`¿Estás seguro de ${actionText} la cuenta del usuario '${username}'?`)) {
    return;
  }

  try {
    await DB.updateUser(userId, { active: !currentActive });
    showToast(`Usuario '${username}' ${currentActive ? 'desactivado' : 'activado'} correctamente.`, 'info');
    renderUsersTable();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}
