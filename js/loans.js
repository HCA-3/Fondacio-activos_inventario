/**
 * FONDACIO COLOMBIA - SISTEMA DE INVENTARIO
 * Módulo de Préstamos y Asignaciones de Equipos
 */

let currentLoanFilter = 'all';

function initLoansModule() {
  const form = document.getElementById('form-loan');
  if (form) {
    form.addEventListener('submit', handleSaveLoanForm);
  }

  const selectAssetEl = document.getElementById('loan-asset-id');
  if (selectAssetEl) {
    selectAssetEl.addEventListener('change', (e) => {
      const asset = DB.getAssetById(e.target.value);
      if (asset) {
        document.getElementById('loan-asset-info-preview').innerHTML = `
          <strong>${escapeHtml(asset.brand)} ${escapeHtml(asset.model)}</strong> (${escapeHtml(asset.code)})
          <br><small>Serial: ${escapeHtml(asset.serial || 'S/N')} • Sede actual: ${escapeHtml(asset.sede)}</small>
        `;
      } else {
        document.getElementById('loan-asset-info-preview').innerHTML = '';
      }
    });
  }
}

function filterLoansByStatus(status) {
  currentLoanFilter = status;
  
  // Actualizar botones de filtro
  document.querySelectorAll('.loan-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });

  renderLoansList();
}

function renderLoansList() {
  const loans = DB.getLoans(currentLoanFilter);
  const tbody = document.getElementById('loans-table-body');
  const emptyState = document.getElementById('loans-empty-state');
  const tableWrap = document.getElementById('loans-table-wrap');

  if (!tbody) return;

  if (loans.length === 0) {
    if (tableWrap) tableWrap.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (tableWrap) tableWrap.style.display = 'block';

  const today = new Date().toISOString().split('T')[0];

  tbody.innerHTML = loans.map(loan => {
    const isOverdue = loan.status === 'activo' && loan.expectedReturnDate && loan.expectedReturnDate < today;
    
    let statusPill = '';
    if (loan.status === 'devuelto') {
      statusPill = `<span class="status-pill status-operativo">Devuelto (${loan.actualReturnDate})</span>`;
    } else if (isOverdue) {
      statusPill = `<span class="status-pill status-baja" style="animation: pulse 1.5s infinite;">⚠️ Vencido</span>`;
    } else {
      statusPill = `<span class="status-pill status-prestado">En Custodia Activa</span>`;
    }

    return `
      <tr>
        <td>
          <span class="asset-code-badge">${loan.assetCode}</span>
          <div style="font-size: 0.82rem; font-weight: 600; margin-top: 0.2rem;">${escapeHtml(loan.assetName)}</div>
        </td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(loan.borrowerName)}</div>
          <div style="font-size: 0.74rem; color: var(--text-secondary);">
            C.C. / ID: ${escapeHtml(loan.borrowerId || 'N/A')} • ${escapeHtml(loan.borrowerRole || 'Beneficiario')}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(loan.borrowerPhone || '')}</div>
        </td>
        <td>
          <div style="font-size: 0.8rem; font-weight: 500;">${escapeHtml(loan.sede)}</div>
          <div style="font-size: 0.74rem; color: var(--text-secondary); max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(loan.purpose || 'Proyecto Social')}
          </div>
        </td>
        <td>
          <div style="font-size: 0.8rem;"><strong>Entrega:</strong> ${loan.loanDate}</div>
          <div style="font-size: 0.75rem; color: ${isOverdue ? 'var(--accent-rose)' : 'var(--text-secondary)'};">
            <strong>Límite:</strong> ${loan.expectedReturnDate || 'Indefinido'}
          </div>
        </td>
        <td>
          ${statusPill}
        </td>
        <td>
          <div class="action-btns-group">
            <button class="icon-button" onclick="printLoanReceipt('${loan.id}')" title="Generar e Imprimir Acta de Entrega">
              <i data-lucide="file-text"></i>
            </button>
            ${loan.status === 'activo' ? `
              <button class="btn btn-sm btn-primary" onclick="openReturnLoanModal('${loan.id}')" title="Registrar Devolución">
                <i data-lucide="check-circle"></i> Devolver
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function openNewLoanModal() {
  const form = document.getElementById('form-loan');
  if (form) form.reset();

  const selectAsset = document.getElementById('loan-asset-id');
  if (!selectAsset) return;

  // Llenar con activos que no estén actualmente prestados ni de baja
  const availableAssets = DB.getAssets().filter(a => a.status === 'operativo' || a.status === 'bodega');

  selectAsset.innerHTML = '<option value="">-- Selecciona un equipo de hardware disponible --</option>' +
    availableAssets.map(a => `
      <option value="${a.id}">
        [${a.code}] ${a.brand} ${a.model} (${a.sede} - ${a.status === 'bodega' ? 'En Bodega' : 'Operativo'})
      </option>
    `).join('');

  document.getElementById('loan-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('loan-asset-info-preview').innerHTML = '';

  openModal('modal-loan-form');
}

function handleSaveLoanForm(e) {
  e.preventDefault();

  const assetId = document.getElementById('loan-asset-id').value;
  if (!assetId) {
    showToast('Selecciona un equipo para asignar el préstamo.', 'error');
    return;
  }

  const asset = DB.getAssetById(assetId);
  if (!asset) return;

  const loanData = {
    assetId: asset.id,
    assetCode: asset.code,
    assetName: `${asset.brand} ${asset.model} (${asset.networkHostname || asset.code})`,
    borrowerName: document.getElementById('loan-borrower-name').value.trim(),
    borrowerId: document.getElementById('loan-borrower-id').value.trim(),
    borrowerRole: document.getElementById('loan-borrower-role').value.trim(),
    borrowerEmail: document.getElementById('loan-borrower-email').value.trim(),
    borrowerPhone: document.getElementById('loan-borrower-phone').value.trim(),
    sede: document.getElementById('loan-sede').value,
    purpose: document.getElementById('loan-purpose').value.trim(),
    loanDate: document.getElementById('loan-date').value,
    expectedReturnDate: document.getElementById('loan-expected-date').value,
    conditionOnLoan: document.getElementById('loan-condition-note').value.trim() || 'Equipo en óptimas condiciones con sus accesorios.'
  };

  if (!loanData.borrowerName) {
    showToast('Por favor ingresa el nombre de la persona o custodio.', 'error');
    return;
  }

  const saved = DB.saveLoan(loanData);
  closeModal('modal-loan-form');
  showToast('Préstamo registrado y estado del activo actualizado a prestado.', 'success');
  
  renderLoansList();
  applyInventoryFilters();
  renderDashboard();

  // Preguntar si desea ver/imprimir el acta de entrega
  setTimeout(() => {
    if (confirm('¿Deseas generar e imprimir el Acta Oficial de Entrega en este momento?')) {
      printLoanReceipt(saved.id);
    }
  }, 350);
}

function openReturnLoanModal(loanId) {
  const loan = DB.getLoanById(loanId);
  if (!loan) return;

  const notes = prompt(`Registrar devolución de: ${loan.assetCode} (${loan.assetName})\nCustodio: ${loan.borrowerName}\n\nIngresa notas u observaciones sobre el estado en que se recibe el equipo:`, 'Equipo recibido completo y en buen estado de funcionamiento.');
  
  if (notes !== null) {
    DB.returnLoan(loanId, notes, 'operativo');
    showToast('Devolución registrada. El activo ha vuelto a estar disponible.', 'success');
    renderLoansList();
    applyInventoryFilters();
    renderDashboard();
  }
}

// --- IMPRESIÓN DEL ACTA OFICIAL DE ENTREGA ---
function printLoanReceipt(loanId) {
  const loan = DB.getLoanById(loanId);
  if (!loan) return;

  const asset = DB.getAssetById(loan.assetId) || {};
  const container = document.getElementById('acta-document-container');
  if (!container) return;

  container.innerHTML = `
    <div class="acta-document">
      <div class="acta-header">
        <div>
          <div style="font-weight: 800; font-size: 1.15rem; color: #1b5e20;">FUNDACIÓN FONDACIO COLOMBIA</div>
          <div style="font-size: 0.78rem; color: #64748b;">NIT: 900.384.129-5 • Personería Jurídica Vigente</div>
          <div style="font-size: 0.78rem; color: #64748b;">Sedes: YLDC Potosí (Ciudad Bolívar) / Altos del Cabo (San Luis)</div>
        </div>
        <div style="text-align: right;">
          <div style="font-family: monospace; font-weight: 800; font-size: 0.95rem; color: #1b5e20;">ACTA N° ${loan.id.toUpperCase()}</div>
          <div style="font-size: 0.75rem; color: #64748b;">Fecha: ${loan.loanDate}</div>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 1.5rem;">
        <h3 style="font-size: 1.1rem; font-weight: 800; text-transform: uppercase; color: #0f2d18;">
          ACTA DE ENTREGA, ASIGNACIÓN Y RESPONSABILIDAD DE EQUIPO DE CÓMPUTO / HARDWARE
        </h3>
      </div>

      <div class="acta-clause">
        Por medio de la presente acta se hace constar la entrega formal del activo de hardware perteneciente a la 
        <strong>Fundación Fondacio Colombia</strong>, en calidad de asignación para actividades institucionales, formativas o comunitarias.
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
        <div style="font-weight: 700; font-size: 0.85rem; color: #1b5e20; margin-bottom: 0.5rem; text-transform: uppercase;">
          1. Identificación del Equipo y Hardware Asignado
        </div>
        <table style="width: 100%; font-size: 0.82rem; border-collapse: collapse;">
          <tr>
            <td style="padding: 3px 0; color: #64748b; width: 35%;">Código de Placa Institucional:</td>
            <td style="padding: 3px 0; font-weight: 700;">${loan.assetCode}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b;">Descripción / Modelo:</td>
            <td style="padding: 3px 0; font-weight: 600;">${escapeHtml(loan.assetName)} (${escapeHtml(asset.brand || '')} ${escapeHtml(asset.model || '')})</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b;">Número de Serie de Fábrica:</td>
            <td style="padding: 3px 0;">${escapeHtml(asset.serial || 'Sin registro')}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b;">Especificaciones Técnicas:</td>
            <td style="padding: 3px 0;">CPU: ${escapeHtml(asset.processor || 'N/A')} | RAM: ${escapeHtml(asset.ram || 'N/A')} | Disco: ${escapeHtml(asset.storage || 'N/A')}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b;">Sede de Asignación:</td>
            <td style="padding: 3px 0;">${escapeHtml(loan.sede)}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b;">Estado Físico al Entregar:</td>
            <td style="padding: 3px 0;">${escapeHtml(loan.conditionOnLoan || 'En buen estado operativo')}</td>
          </tr>
        </table>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
        <div style="font-weight: 700; font-size: 0.85rem; color: #1b5e20; margin-bottom: 0.5rem; text-transform: uppercase;">
          2. Datos del Custodio / Receptor
        </div>
        <table style="width: 100%; font-size: 0.82rem; border-collapse: collapse;">
          <tr>
            <td style="padding: 3px 0; color: #64748b; width: 35%;">Nombre Completo:</td>
            <td style="padding: 3px 0; font-weight: 700;">${escapeHtml(loan.borrowerName)}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b;">Documento de Identidad (C.C. / T.I.):</td>
            <td style="padding: 3px 0; font-weight: 600;">${escapeHtml(loan.borrowerId || 'No especificado')}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b;">Rol / Vinculación:</td>
            <td style="padding: 3px 0;">${escapeHtml(loan.borrowerRole || 'Personal / Voluntario')}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b;">Motivo / Proyecto:</td>
            <td style="padding: 3px 0;">${escapeHtml(loan.purpose || 'Actividades de la Fundación')}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b;">Fecha Límite de Devolución:</td>
            <td style="padding: 3px 0; font-weight: 700; color: #1b5e20;">${loan.expectedReturnDate || 'Hasta finalizar período de asignación'}</td>
          </tr>
        </table>
      </div>

      <div class="acta-clause" style="font-size: 0.78rem; color: #475569; margin-top: 1rem;">
        <strong>Compromiso de Cuidado:</strong> El receptor se compromete a velar por el buen uso, integridad física, 
        cuidado de los periféricos y conservación del software del equipo entregado. En caso de pérdida, hurto o daño por 
        negligencia, se notificará de inmediato a la coordinación de Fondacio Colombia para realizar el trámite correspondiente.
      </div>

      <div class="acta-signatures">
        <div class="signature-line">
          <div>Entregado por (Fondacio Colombia)</div>
          <p>Coordinación / Responsable de Inventario</p>
        </div>
        <div class="signature-line">
          <div>Recibido a Conformidad</div>
          <p>${escapeHtml(loan.borrowerName)}<br>C.C. ${escapeHtml(loan.borrowerId || '___________________')}</p>
        </div>
      </div>
    </div>
  `;

  openModal('modal-acta-view');
}
