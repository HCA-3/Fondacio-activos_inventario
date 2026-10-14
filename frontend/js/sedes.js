/**
 * FONDACIO COLOMBIA - SISTEMA DE INVENTARIO
 * Módulo de Gestión Dinámica de Sedes y Espacios Físicos conectado a la API
 */

let currentActiveSedeId = null;

function initSedesModule() {
  const form = document.getElementById('form-sede');
  if (form) {
    form.addEventListener('submit', handleSaveSedeForm);
  }

  // Actualizar todos los dropdowns de sedes en la app
  updateAllSedeDropdowns();

  // Listener en formulario de activos para auto-completar dirección al elegir sede
  const assetSedeSelect = document.getElementById('asset-sede');
  if (assetSedeSelect) {
    assetSedeSelect.addEventListener('change', async (e) => {
      const selectedSedeName = e.target.value;
      const sedeObj = await DB.getSedeByName(selectedSedeName);
      if (sedeObj) {
        const addrField = document.getElementById('asset-address');
        if (addrField) {
          addrField.value = `${sedeObj.address || ''}${sedeObj.city ? ', ' + sedeObj.city : ''}`;
        }
      }
      suggestAssetCode();
    });
  }
}

async function updateAllSedeDropdowns() {
  try {
    const sedes = await DB.getSedes();

    // 1. Dropdown Filtro Inventario
    const filterSede = document.getElementById('filter-sede');
    if (filterSede) {
      const currentVal = filterSede.value || 'all';
      filterSede.innerHTML = '<option value="all">🏢 Todas las Sedes</option>' +
        sedes.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)} (${escapeHtml(s.city || 'Fondacio')})</option>`).join('');
      filterSede.value = currentVal;
    }

    // 2. Dropdown Formulario Activo
    const assetSede = document.getElementById('asset-sede');
    if (assetSede) {
      const currentVal = assetSede.value || (sedes[0] ? sedes[0].name : '');
      assetSede.innerHTML = sedes.map(s => 
        `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)} - ${escapeHtml(s.city || '')}</option>`
      ).join('');
      if (currentVal) assetSede.value = currentVal;
    }

    // 3. Dropdown Formulario Préstamo
    const loanSede = document.getElementById('loan-sede');
    if (loanSede) {
      const currentVal = loanSede.value || (sedes[0] ? sedes[0].name : '');
      loanSede.innerHTML = sedes.map(s => 
        `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`
      ).join('');
      if (currentVal) loanSede.value = currentVal;
    }

    // 4. Sidebar Pills
    renderSidebarSedePills(sedes);
  } catch (err) {
    console.error('Error al actualizar dropdowns de sedes:', err);
  }
}

function renderSidebarSedePills(sedesList) {
  const container = document.getElementById('sidebar-sedes-pills');
  if (!container) return;

  const sedes = sedesList || [];
  container.innerHTML = sedes.map(s => `
    <span class="sede-pill" title="${escapeHtml(s.address || s.name)}">
      <span class="dot" style="background-color: ${s.color || '#4caf50'};"></span>
      ${escapeHtml(s.name)}
    </span>
  `).join('');
}

async function renderSedesList() {
  const container = document.getElementById('sedes-cards-container');
  if (!container) return;

  try {
    const [sedes, stats, loans] = await Promise.all([
      DB.getSedes(),
      DB.getDashboardStats().catch(() => ({ bySede: {} })),
      DB.getLoans('activo').catch(() => [])
    ]);

    container.innerHTML = sedes.map(sede => {
      const assetCount = (stats && stats.bySede && stats.bySede[sede.name]) ? stats.bySede[sede.name] : 0;
      const activeLoansCount = loans.filter(l => l.sede === sede.name).length;

      return `
        <div class="card-panel sede-detail-card" style="border-top: 4px solid ${sede.color || 'var(--primary-500)'};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="dot" style="background-color: ${sede.color || '#4caf50'}; width: 10px; height: 10px;"></span>
                <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin: 0;">${escapeHtml(sede.name)}</h3>
              </div>
              <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem;">${escapeHtml(sede.fullName || sede.name)}</p>
            </div>
            <span class="asset-code-badge">${escapeHtml(sede.code || 'SEDE')}</span>
          </div>

          <div class="sede-location-box">
            <div style="display: flex; gap: 0.5rem; align-items: flex-start; font-size: 0.85rem; color: var(--text-main);">
              <i data-lucide="map-pin" style="width: 16px; height: 16px; color: ${sede.color || 'var(--primary-500)'}; flex-shrink: 0; margin-top: 3px;"></i>
              <div>
                <strong>${escapeHtml(sede.address || 'Sin dirección registrada')}</strong>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">${escapeHtml(sede.city || 'Bogotá D.C.')}</div>
              </div>
            </div>

            ${sede.phone || sede.email ? `
              <div style="display: flex; gap: 1rem; margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary); flex-wrap: wrap;">
                ${sede.phone ? `<span>📞 ${escapeHtml(sede.phone)}</span>` : ''}
                ${sede.email ? `<span>✉️ ${escapeHtml(sede.email)}</span>` : ''}
              </div>
            ` : ''}
          </div>

          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.75rem 0; line-height: 1.4;">
            ${escapeHtml(sede.focus || 'Espacio formativo y comunitario de Fondacio Colombia.')}
          </p>

          <div style="background: var(--bg-app); border-radius: var(--radius-sm); padding: 0.6rem 0.85rem; display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 1rem;">
            <span>Equipos registrados: <strong>${assetCount}</strong></span>
            <span>Préstamos activos: <strong>${activeLoansCount}</strong></span>
          </div>

          <div style="display: flex; gap: 0.5rem; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
            <button class="btn btn-sm btn-secondary" onclick="filterBySedeAndGo('${escapeHtml(sede.name)}')">
              <i data-lucide="list"></i> Ver Equipos
            </button>
            <div class="action-btns-group">
              <button class="icon-button admin-only" data-admin-only onclick="openEditSedeModal('${sede.id}')" title="Editar Sede">
                <i data-lucide="edit-3"></i>
              </button>
              <button class="icon-button admin-only" data-admin-only onclick="confirmDeleteSede('${sede.id}')" title="Eliminar Sede" style="color: var(--accent-rose);">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error('Error al renderizar sedes:', err);
    showToast('Error al cargar sedes: ' + err.message, 'error');
  }
}

function openNewSedeModal() {
  currentActiveSedeId = null;
  const form = document.getElementById('form-sede');
  if (form) form.reset();

  document.getElementById('modal-sede-title').textContent = 'Registrar Nueva Sede / Espacio Físico';
  document.getElementById('sede-id').value = '';
  document.getElementById('sede-color').value = '#2e7d32';

  openModal('modal-sede-form');
}

async function openEditSedeModal(id) {
  try {
    const sede = await DB.getSedeById(id);
    if (!sede) return;

    currentActiveSedeId = id;
    document.getElementById('modal-sede-title').textContent = `Editar Sede: ${sede.name}`;

    document.getElementById('sede-id').value = sede.id;
    document.getElementById('sede-name').value = sede.name || '';
    document.getElementById('sede-fullname').value = sede.fullName || '';
    document.getElementById('sede-code').value = sede.code || '';
    document.getElementById('sede-address').value = sede.address || '';
    document.getElementById('sede-city').value = sede.city || '';
    document.getElementById('sede-phone').value = sede.phone || '';
    document.getElementById('sede-email').value = sede.email || '';
    document.getElementById('sede-color').value = sede.color || '#2e7d32';
    document.getElementById('sede-focus').value = sede.focus || '';

    openModal('modal-sede-form');
  } catch (err) {
    showToast('Error al cargar datos de la sede: ' + err.message, 'error');
  }
}

async function handleSaveSedeForm(e) {
  e.preventDefault();

  const id = document.getElementById('sede-id').value;
  const sedeData = {
    id: id || undefined,
    name: document.getElementById('sede-name').value.trim(),
    fullName: document.getElementById('sede-fullname').value.trim(),
    code: document.getElementById('sede-code').value.trim().toUpperCase(),
    address: document.getElementById('sede-address').value.trim(),
    city: document.getElementById('sede-city').value.trim(),
    phone: document.getElementById('sede-phone').value.trim(),
    email: document.getElementById('sede-email').value.trim(),
    color: document.getElementById('sede-color').value,
    focus: document.getElementById('sede-focus').value.trim()
  };

  if (!sedeData.name) {
    showToast('Por favor diligencia el nombre de la sede.', 'error');
    return;
  }

  try {
    await DB.saveSede(sedeData);
    closeModal('modal-sede-form');
    showToast(id ? 'Sede actualizada exitosamente.' : 'Nueva sede registrada en Fondacio Colombia.', 'success');

    await updateAllSedeDropdowns();
    await renderSedesList();
    await renderDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function confirmDeleteSede(id) {
  try {
    const sede = await DB.getSedeById(id);
    if (!sede) return;

    if (!confirm(`¿Deseas eliminar la sede "${sede.name}"?`)) {
      return;
    }

    await DB.deleteSede(id);
    showToast('Sede eliminada del sistema.', 'info');
    await updateAllSedeDropdowns();
    await renderSedesList();
    await renderDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
