/**
 * FONDACIO COLOMBIA - SISTEMA DE INVENTARIO
 * Módulo de Personalización Visual, Temas y Paletas de Color en Tiempo Real
 */

const COLOR_PRESETS = {
  'fondacio-green': {
    name: 'Verde Fondacio & Naturaleza',
    primaryColor: '#2e7d32',
    primaryDark: '#1b5e20',
    primaryLight: '#e8f5e9',
    secondaryColor: '#1565c0',
    sidebarBg: '#0f2d18',
    appBg: '#f4f7f6',
    accentColor: '#f59e0b'
  },
  'blue-tech': {
    name: 'Azul Social & Institucional',
    primaryColor: '#1565c0',
    primaryDark: '#0d47a1',
    primaryLight: '#e3f2fd',
    secondaryColor: '#2e7d32',
    sidebarBg: '#0a192f',
    appBg: '#f0f4f8',
    accentColor: '#0284c7'
  },
  'amber-warm': {
    name: 'Ámbar Cálido & Comunitario',
    primaryColor: '#d97706',
    primaryDark: '#b45309',
    primaryLight: '#fef3c7',
    secondaryColor: '#1565c0',
    sidebarBg: '#271900',
    appBg: '#faf6f0',
    accentColor: '#e11d48'
  },
  'emerald-modern': {
    name: 'Esmeralda Moderno',
    primaryColor: '#059669',
    primaryDark: '#047857',
    primaryLight: '#d1fae5',
    secondaryColor: '#0284c7',
    sidebarBg: '#062b1e',
    appBg: '#f0fdf4',
    accentColor: '#f59e0b'
  },
  'purple-youth': {
    name: 'Púrpura Liderazgo & Juventud',
    primaryColor: '#7c3aed',
    primaryDark: '#5b21b6',
    primaryLight: '#ede9fe',
    secondaryColor: '#059669',
    sidebarBg: '#1e103a',
    appBg: '#fbf7ff',
    accentColor: '#ec4899'
  }
};

function initCustomizerModule() {
  // Aplicar tema guardado al cargar
  const currentConfig = DB.getThemeConfig();
  applyCustomColorsToDOM(currentConfig);

  // Inicializar inputs del modal de personalización
  const primaryInput = document.getElementById('custom-primary-color');
  const darkInput = document.getElementById('custom-dark-color');
  const sidebarInput = document.getElementById('custom-sidebar-color');
  const appBgInput = document.getElementById('custom-appbg-color');
  const accentInput = document.getElementById('custom-accent-color');

  if (primaryInput) {
    primaryInput.value = currentConfig.primaryColor;
    primaryInput.addEventListener('input', (e) => {
      document.documentElement.style.setProperty('--primary-500', e.target.value);
    });
  }

  if (darkInput) {
    darkInput.value = currentConfig.primaryDark;
    darkInput.addEventListener('input', (e) => {
      document.documentElement.style.setProperty('--primary-600', e.target.value);
    });
  }

  if (sidebarInput) {
    sidebarInput.value = currentConfig.sidebarBg;
    sidebarInput.addEventListener('input', (e) => {
      document.documentElement.style.setProperty('--bg-sidebar', e.target.value);
    });
  }

  if (appBgInput) {
    appBgInput.value = currentConfig.appBg;
    appBgInput.addEventListener('input', (e) => {
      document.documentElement.style.setProperty('--bg-app', e.target.value);
    });
  }

  if (accentInput) {
    accentInput.value = currentConfig.accentColor;
    accentInput.addEventListener('input', (e) => {
      document.documentElement.style.setProperty('--accent-amber', e.target.value);
    });
  }

  // Renderizar chips de presets en el modal
  renderPresetSwatches();
}

function renderPresetSwatches() {
  const container = document.getElementById('preset-swatches-container');
  if (!container) return;

  container.innerHTML = Object.keys(COLOR_PRESETS).map(key => {
    const p = COLOR_PRESETS[key];
    return `
      <div class="preset-card" onclick="selectColorPreset('${key}')" style="cursor: pointer; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.65rem; background: var(--bg-surface); transition: all 0.2s;">
        <div style="display: flex; gap: 4px; margin-bottom: 0.4rem;">
          <div style="width: 22px; height: 22px; border-radius: 4px; background: ${p.primaryColor};"></div>
          <div style="width: 22px; height: 22px; border-radius: 4px; background: ${p.sidebarBg};"></div>
          <div style="width: 22px; height: 22px; border-radius: 4px; background: ${p.accentColor};"></div>
          <div style="width: 22px; height: 22px; border-radius: 4px; background: ${p.appBg}; border: 1px solid #ccc;"></div>
        </div>
        <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-main);">${escapeHtml(p.name)}</div>
      </div>
    `;
  }).join('');
}

function selectColorPreset(presetKey) {
  const preset = COLOR_PRESETS[presetKey];
  if (!preset) return;

  const config = {
    preset: presetKey,
    ...preset
  };

  applyCustomColorsToDOM(config);
  syncColorInputsWithConfig(config);
}

function syncColorInputsWithConfig(config) {
  const p = document.getElementById('custom-primary-color');
  const d = document.getElementById('custom-dark-color');
  const s = document.getElementById('custom-sidebar-color');
  const a = document.getElementById('custom-appbg-color');
  const ac = document.getElementById('custom-accent-color');

  if (p) p.value = config.primaryColor;
  if (d) d.value = config.primaryDark;
  if (s) s.value = config.sidebarBg;
  if (a) a.value = config.appBg;
  if (ac) ac.value = config.accentColor;
}

function applyCustomColorsToDOM(config) {
  if (!config) return;

  const root = document.documentElement;
  if (config.primaryColor) {
    root.style.setProperty('--primary-500', config.primaryColor);
  }
  if (config.primaryDark) {
    root.style.setProperty('--primary-600', config.primaryDark);
  }
  if (config.sidebarBg) {
    root.style.setProperty('--bg-sidebar', config.sidebarBg);
  }
  if (config.appBg) {
    root.style.setProperty('--bg-app', config.appBg);
  }
  if (config.accentColor) {
    root.style.setProperty('--accent-amber', config.accentColor);
  }
}

function saveCustomColors() {
  const config = {
    primaryColor: document.getElementById('custom-primary-color')?.value || '#2e7d32',
    primaryDark: document.getElementById('custom-dark-color')?.value || '#1b5e20',
    sidebarBg: document.getElementById('custom-sidebar-color')?.value || '#0f2d18',
    appBg: document.getElementById('custom-appbg-color')?.value || '#f4f7f6',
    accentColor: document.getElementById('custom-accent-color')?.value || '#f59e0b'
  };

  DB.saveThemeConfig(config);
  applyCustomColorsToDOM(config);
  closeModal('modal-customizer');
  showToast('Paleta de colores personalizada guardada con éxito.', 'success');
  renderDashboard(); // refrescar colores en gráficos
}

function resetDefaultColors() {
  if (confirm('¿Restablecer los colores institucionales originales de Fondacio Colombia?')) {
    const defaults = DB.resetThemeConfig();
    applyCustomColorsToDOM(defaults);
    syncColorInputsWithConfig(defaults);
    closeModal('modal-customizer');
    showToast('Colores restablecidos a la paleta institucional por defecto.', 'info');
    renderDashboard();
  }
}

function openCustomizerModal() {
  const config = DB.getThemeConfig();
  syncColorInputsWithConfig(config);
  openModal('modal-customizer');
}
