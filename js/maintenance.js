/**
 * FONDACIO COLOMBIA - SISTEMA DE INVENTARIO
 * Módulo de Mantenimientos y Bitácora Técnica de Hardware
 */

let currentMaintFilter = 'all';

function initMaintenanceModule() {
  const form = document.getElementById('form-maintenance');
  if (form) {
    form.addEventListener('submit', handleSaveMaintenanceForm);
  }

  const selectAsset = document.getElementById('maint-asset-id');
  if (selectAsset) {
    selectAsset.addEventListener('change', (e) => {
      const asset = DB.getAssetById(e.target.value);
      const preview = document.getElementById('maint-asset-info-preview');
      if (asset && preview) {
        preview.innerHTML = `
          <strong>${escapeHtml(asset.brand)} ${escapeHtml(asset.model)}</strong> (${escapeHtml(asset.code)})
          <br><small>Sede: ${escapeHtml(asset.sede)} • Estado actual: ${escapeHtml(asset.status)}</small>
        `;
      } else if (preview) {
        preview.innerHTML = '';
      }
    });
  }
}

function filterMaintByStatus(status) {
  currentMaintFilter = status;
  document.querySelectorAll('.maint-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
  renderMaintenanceList();
}

function renderMaintenanceList() {
  const list = DB.getMaintenances(currentMaintFilter);
  const tbody = document.getElementById('maint-table-body');
  const emptyState = document.getElementById('maint-empty-state');
  const tableWrap = document.getElementById('maint-table-wrap');

  if (!tbody) return;

  if (list.length === 0) {
    if (tableWrap) tableWrap.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (tableWrap) tableWrap.style.display = 'block';

  tbody.innerHTML = list.map(item => {
    let statusPill = '';
    if (item.status === 'completado') {
      statusPill = `<span class="status-pill status-operativo">Completado (${item.completionDate || 'Listo'})</span>`;
    } else if (item.status === 'en_progreso') {
      statusPill = `<span class="status-pill status-mantenimiento">En Servicio</span>`;
    } else {
      statusPill = `<span class="status-pill status-prestado">Programado (${item.scheduledDate || 'Pendiente'})</span>`;
    }

    const typeBadge = item.type === 'preventivo' 
      ? '<span class="status-pill status-operativo" style="font-size: 0.7rem;">Preventivo</span>'
      : item.type === 'correctivo'
      ? '<span class="status-pill status-mantenimiento" style="font-size: 0.7rem;">Correctivo</span>'
      : '<span class="status-pill status-bodega" style="font-size: 0.7rem;">Mejora / Upgrade</span>';

    return `
      <tr>
        <td>
          <span class="asset-code-badge">${item.assetCode}</span>
          <div style="font-weight: 600; font-size: 0.82rem; margin-top: 0.2rem;">${escapeHtml(item.assetName)}</div>
        </td>
        <td>
          ${typeBadge}
          <div style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 0.2rem;">
            ${escapeHtml(item.description || '')}
          </div>
        </td>
        <td>
          <div style="font-weight: 500; font-size: 0.8rem;">${escapeHtml(item.technician || 'Soporte')}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">
            Costo: ${formatCurrency(item.cost || 0)}
          </div>
        </td>
        <td>
          <div style="font-size: 0.78rem;"><strong>Fecha:</strong> ${item.scheduledDate || item.requestDate}</div>
          ${item.nextScheduledMaintenance ? `
            <div style="font-size: 0.72rem; color: var(--primary-600);">
              Próximo: ${item.nextScheduledMaintenance}
            </div>
          ` : ''}
        </td>
        <td>
          ${statusPill}
        </td>
        <td>
          <div class="action-btns-group">
            ${item.status !== 'completado' ? `
              <button class="btn btn-sm btn-primary" onclick="completeMaintenancePrompt('${item.id}')" title="Marcar como Completado">
                <i data-lucide="check"></i> Finalizar
              </button>
            ` : `
              <button class="icon-button" onclick="viewMaintenanceDetails('${item.id}')" title="Ver Detalle">
                <i data-lucide="eye"></i>
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function openNewMaintenanceModal() {
  const form = document.getElementById('form-maintenance');
  if (form) form.reset();

  const selectAsset = document.getElementById('maint-asset-id');
  if (!selectAsset) return;

  const allAssets = DB.getAssets();
  selectAsset.innerHTML = '<option value="">-- Selecciona el equipo para mantenimiento --</option>' +
    allAssets.map(a => `
      <option value="${a.id}">
        [${a.code}] ${a.name} (${a.sede} - ${a.status})
      </option>
    `).join('');

  document.getElementById('maint-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('maint-asset-info-preview').innerHTML = '';

  openModal('modal-maintenance-form');
}

function handleSaveMaintenanceForm(e) {
  e.preventDefault();

  const assetId = document.getElementById('maint-asset-id').value;
  if (!assetId) {
    showToast('Selecciona un equipo para registrar mantenimiento.', 'error');
    return;
  }

  const asset = DB.getAssetById(assetId);
  if (!asset) return;

  const maintData = {
    assetId: asset.id,
    assetCode: asset.code,
    assetName: asset.name,
    type: document.getElementById('maint-type').value,
    status: document.getElementById('maint-status').value,
    requestDate: new Date().toISOString().split('T')[0],
    scheduledDate: document.getElementById('maint-date').value,
    technician: document.getElementById('maint-technician').value.trim(),
    cost: Number(document.getElementById('maint-cost').value) || 0,
    description: document.getElementById('maint-description').value.trim(),
    replacedParts: document.getElementById('maint-parts').value.trim(),
    nextScheduledMaintenance: document.getElementById('maint-next-date').value,
    notes: document.getElementById('maint-notes').value.trim()
  };

  DB.saveMaintenance(maintData);
  closeModal('modal-maintenance-form');
  showToast('Registro de mantenimiento guardado con éxito.', 'success');

  renderMaintenanceList();
  applyInventoryFilters();
  renderDashboard();
}

function completeMaintenancePrompt(maintId) {
  const maint = DB.getMaintenanceById(maintId);
  if (!maint) return;

  const notes = prompt(`Completar servicio para: ${maint.assetCode}\n\nIngresa notas finales del trabajo realizado y componentes sustituidos:`, 'Servicio técnico concluido satisfactoriamente. Equipo probado y operativo.');
  
  if (notes !== null) {
    DB.completeMaintenance(maintId, notes, 'operativo');
    showToast('Mantenimiento finalizado. El equipo ahora figura como Operativo.', 'success');
    renderMaintenanceList();
    applyInventoryFilters();
    renderDashboard();
  }
}

function viewMaintenanceDetails(maintId) {
  const m = DB.getMaintenanceById(maintId);
  if (!m) return;

  alert(`Detalles del Mantenimiento:\n\nEquipo: ${m.assetCode} - ${m.assetName}\nTipo: ${m.type.toUpperCase()}\nEstado: ${m.status.toUpperCase()}\nTécnico: ${m.technician || 'N/A'}\nCosto: ${formatCurrency(m.cost || 0)}\nDetalle: ${m.description}\nRepuestos: ${m.replacedParts || 'Ninguno'}\nNotas: ${m.notes || 'Sin notas'}`);
}
