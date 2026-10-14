/**
 * FONDACIO COLOMBIA - SISTEMA DE INVENTARIO
 * Módulo de Mantenimientos y Bitácora Técnica de Hardware conectado a la API de FastAPI
 */

let currentMaintFilter = 'all';

function initMaintenanceModule() {
  const form = document.getElementById('form-maintenance');
  if (form) {
    form.addEventListener('submit', handleSaveMaintenanceForm);
  }

  const selectAsset = document.getElementById('maint-asset-id');
  if (selectAsset) {
    selectAsset.addEventListener('change', async (e) => {
      const assetId = e.target.value;
      const preview = document.getElementById('maint-asset-info-preview');
      if (!assetId) {
        if (preview) preview.innerHTML = '';
        return;
      }
      try {
        const asset = await DB.getAssetById(assetId);
        if (asset && preview) {
          preview.innerHTML = `
            <strong>${escapeHtml(asset.brand || '')} ${escapeHtml(asset.model || '')}</strong> (${escapeHtml(asset.code)})
            <br><small>Sede: ${escapeHtml(asset.sede)} • Estado actual: ${escapeHtml(asset.status)} • S.O.: ${escapeHtml(asset.os || '')}</small>
          `;
        }
      } catch (err) {
        if (preview) preview.innerHTML = '';
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

async function renderMaintenanceList() {
  const tbody = document.getElementById('maint-table-body');
  const emptyState = document.getElementById('maint-empty-state');
  const tableWrap = document.getElementById('maint-table-wrap');

  if (!tbody) return;

  try {
    const list = await DB.getMaintenances(currentMaintFilter);

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
        statusPill = `<span class="status-pill status-mantenimiento">En Servicio / Taller</span>`;
      } else {
        statusPill = `<span class="status-pill status-prestado">Programado (${item.scheduledDate || 'Pendiente'})</span>`;
      }

      const typeBadge = item.type === 'preventivo' 
        ? '<span class="status-pill status-operativo" style="font-size: 0.7rem;">Preventivo</span>'
        : item.type === 'correctivo'
        ? '<span class="status-pill status-baja" style="font-size: 0.7rem;">Correctivo Urgente</span>'
        : '<span class="status-pill status-prestado" style="font-size: 0.7rem;">Adecuación / Upgrade</span>';

      return `
        <tr>
          <td>
            <span class="asset-code-badge">${escapeHtml(item.assetCode)}</span>
            <div style="font-weight: 700; font-size: 0.82rem; margin-top: 0.2rem;">${escapeHtml(item.assetName)}</div>
          </td>
          <td>
            ${typeBadge}
            <div style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 0.25rem; line-height: 1.4;">
              ${escapeHtml(item.description || '')}
            </div>
            ${item.replacedParts ? `
              <div style="font-size: 0.7rem; color: var(--primary-600); margin-top: 0.2rem;">
                <strong>Componentes:</strong> ${escapeHtml(item.replacedParts)}
              </div>
            ` : ''}
          </td>
          <td>
            <div style="font-weight: 500; font-size: 0.8rem;">${escapeHtml(item.technician || 'Soporte TIC')}</div>
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
                <button class="btn btn-sm btn-primary admin-only" data-admin-only onclick="completeMaintenancePrompt('${item.id}')" title="Marcar como Completado">
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
  } catch (err) {
    console.error('Error al renderizar lista de mantenimientos:', err);
    showToast('Error al cargar mantenimientos: ' + err.message, 'error');
  }
}

async function openNewMaintenanceModal() {
  const form = document.getElementById('form-maintenance');
  if (form) form.reset();

  const selectAsset = document.getElementById('maint-asset-id');
  if (!selectAsset) return;

  try {
    const allAssets = await DB.getAssets({ limit: 500 });
    selectAsset.innerHTML = '<option value="">-- Selecciona el equipo para mantenimiento --</option>' +
      allAssets.map(a => `
        <option value="${a.id}">
          [${a.code}] ${a.brand || ''} ${a.model || ''} (${a.sede} - ${a.status})
        </option>
      `).join('');

    document.getElementById('maint-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('maint-asset-info-preview').innerHTML = '';

    openModal('modal-maintenance-form');
  } catch (err) {
    showToast('Error al cargar equipos: ' + err.message, 'error');
  }
}

async function handleSaveMaintenanceForm(e) {
  e.preventDefault();

  const assetId = document.getElementById('maint-asset-id').value;
  if (!assetId) {
    showToast('Selecciona un equipo para registrar mantenimiento.', 'error');
    return;
  }

  const maintData = {
    assetId: assetId,
    type: document.getElementById('maint-type').value,
    status: document.getElementById('maint-status').value || 'programado',
    requestDate: new Date().toISOString().split('T')[0],
    scheduledDate: document.getElementById('maint-date').value || null,
    technician: document.getElementById('maint-technician').value.trim(),
    cost: Number(document.getElementById('maint-cost').value) || 0,
    description: document.getElementById('maint-description').value.trim(),
    replacedParts: document.getElementById('maint-parts').value.trim(),
    nextScheduledMaintenance: document.getElementById('maint-next-date').value || null,
    notes: document.getElementById('maint-notes').value.trim()
  };

  try {
    await DB.saveMaintenance(maintData);
    closeModal('modal-maintenance-form');
    showToast('Registro de mantenimiento guardado con éxito.', 'success');

    await renderMaintenanceList();
    await applyInventoryFilters();
    await renderDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function completeMaintenancePrompt(maintId) {
  try {
    const maint = await DB.getMaintenanceById(maintId);
    if (!maint) return;

    const notes = prompt(`Completar servicio para: ${maint.assetCode}\n\nIngresa notas finales del trabajo realizado y componentes sustituidos:`, 'Servicio técnico concluido satisfactoriamente. Equipo probado y operativo.');
    
    if (notes !== null) {
      await DB.completeMaintenance(maintId, notes, 'operativo');
      showToast('Mantenimiento finalizado. El equipo ahora figura como Operativo.', 'success');
      await renderMaintenanceList();
      await applyInventoryFilters();
      await renderDashboard();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function viewMaintenanceDetails(maintId) {
  try {
    const m = await DB.getMaintenanceById(maintId);
    if (!m) return;

    alert(`Detalles del Mantenimiento:\n\nEquipo: ${m.assetCode} - ${m.assetName}\nTipo: ${(m.type || '').toUpperCase()}\nEstado: ${(m.status || '').toUpperCase()}\nTécnico: ${m.technician || 'N/A'}\nCosto: ${formatCurrency(m.cost || 0)}\nDetalle: ${m.description || 'Sin detalle'}\nRepuestos: ${m.replacedParts || 'Ninguno'}\nNotas: ${m.notes || 'Sin notas'}`);
  } catch (err) {
    showToast(err.message, 'error');
  }
}
