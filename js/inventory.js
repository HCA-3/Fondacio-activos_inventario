/**
 * FONDACIO COLOMBIA - SISTEMA DE INVENTARIO
 * Módulo de Gestión de Activos de Hardware y Hojas de Vida Oficiales
 */

let currentViewMode = 'table'; // 'table' | 'grid'
let currentActiveAssetId = null;

function initInventoryModule() {
  const searchInput = document.getElementById('inventory-search-input');
  const filterSede = document.getElementById('filter-sede');
  const filterType = document.getElementById('filter-type');
  const filterStatus = document.getElementById('filter-status');

  if (searchInput) searchInput.addEventListener('input', debounce(applyInventoryFilters, 200));
  if (filterSede) filterSede.addEventListener('change', applyInventoryFilters);
  if (filterType) filterType.addEventListener('change', applyInventoryFilters);
  if (filterStatus) filterStatus.addEventListener('change', applyInventoryFilters);

  // Form submit
  const assetForm = document.getElementById('form-asset');
  if (assetForm) {
    assetForm.addEventListener('submit', handleSaveAssetForm);
  }
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function setViewMode(mode) {
  currentViewMode = mode;
  document.getElementById('btn-view-table')?.classList.toggle('active', mode === 'table');
  document.getElementById('btn-view-grid')?.classList.toggle('active', mode === 'grid');
  applyInventoryFilters();
}

function getFilterValues() {
  return {
    search: document.getElementById('inventory-search-input')?.value || '',
    sede: document.getElementById('filter-sede')?.value || 'all',
    computerType: document.getElementById('filter-type')?.value || 'all',
    status: document.getElementById('filter-status')?.value || 'all'
  };
}

function applyInventoryFilters() {
  const filters = getFilterValues();
  const assets = DB.getAssets(filters);
  renderInventoryList(assets);
}

function renderInventoryList(assets) {
  const tableContainer = document.getElementById('inventory-table-container');
  const gridContainer = document.getElementById('inventory-grid-container');
  const emptyState = document.getElementById('inventory-empty-state');
  const countBadge = document.getElementById('filtered-count-badge');

  if (countBadge) {
    countBadge.textContent = `${assets.length} equipos`;
  }

  if (assets.length === 0) {
    if (tableContainer) tableContainer.style.display = 'none';
    if (gridContainer) gridContainer.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  if (currentViewMode === 'table') {
    if (tableContainer) tableContainer.style.display = 'block';
    if (gridContainer) gridContainer.style.display = 'none';
    renderTableView(assets);
  } else {
    if (tableContainer) tableContainer.style.display = 'none';
    if (gridContainer) gridContainer.style.display = 'grid';
    renderGridView(assets);
  }

  if (window.lucide) lucide.createIcons();
}

function getStatusBadge(status) {
  const map = {
    operativo: { label: 'Operativo', class: 'status-operativo' },
    prestado: { label: 'Prestado', class: 'status-prestado' },
    mantenimiento: { label: 'Mantenimiento', class: 'status-mantenimiento' },
    bodega: { label: 'En Bodega', class: 'status-bodega' },
    baja: { label: 'De Baja', class: 'status-baja' }
  };
  const item = map[status] || { label: status, class: 'status-bodega' };
  return `<span class="status-pill ${item.class}">${item.label}</span>`;
}

function getSedeDot(sede) {
  if (sede === 'YLDC Potosí') return '<span class="dot dot-potosi"></span>';
  if (sede === 'Altos del Cabo') return '<span class="dot dot-sanluis"></span>';
  return '<span class="dot" style="background-color: var(--secondary-500);"></span>';
}

function renderTableView(assets) {
  const tbody = document.getElementById('inventory-table-body');
  if (!tbody) return;

  tbody.innerHTML = assets.map(asset => {
    return `
      <tr>
        <td>
          <span class="asset-code-badge">${asset.code}</span>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">Área: ${escapeHtml(asset.area || 'General')}</div>
        </td>
        <td>
          <div class="asset-main-info">
            <span class="asset-title">${escapeHtml(asset.brand)} ${escapeHtml(asset.model)} (${escapeHtml(asset.computerType || 'Computador')})</span>
            <span class="asset-specs">Serial: <strong>${escapeHtml(asset.serial || 'S/N')}</strong> • CPU: ${escapeHtml(asset.processor || 'N/A')}</span>
            <span style="font-size: 0.72rem; color: var(--primary-600);">RAM: ${escapeHtml(asset.ram || '')} | Disco: ${escapeHtml(asset.disk1Capacity || '')} ${escapeHtml(asset.disk1Tech || '')}</span>
          </div>
        </td>
        <td>
          <div style="font-weight: 500; font-size: 0.82rem;">${escapeHtml(asset.networkHostname || 'N/A')}</div>
          <div style="font-size: 0.72rem; color: var(--text-secondary);">IP: ${escapeHtml(asset.ip || 'DHCP')}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted);">MAC: ${escapeHtml(asset.mac || '')}</div>
        </td>
        <td>
          <div class="badge-sede">
            ${getSedeDot(asset.sede)}
            <span>${escapeHtml(asset.sede)}</span>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-secondary);">${escapeHtml(asset.location || '')}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(asset.assignedTo || 'Sin asignar')}</div>
        </td>
        <td>
          ${getStatusBadge(asset.status)}
        </td>
        <td>
          <div class="action-btns-group">
            <button class="btn btn-sm btn-primary" onclick="viewHojaDeVida('${asset.id}')" title="Ver e Imprimir Hoja de Vida">
              <i data-lucide="file-spreadsheet"></i> Hoja de Vida
            </button>
            <button class="icon-button" onclick="showAssetQRCode('${asset.id}')" title="Etiqueta QR">
              <i data-lucide="qr-code"></i>
            </button>
            <button class="icon-button" onclick="openEditAssetModal('${asset.id}')" title="Editar">
              <i data-lucide="edit-3"></i>
            </button>
            <button class="icon-button" onclick="confirmDeleteAsset('${asset.id}')" title="Eliminar" style="color: var(--accent-rose);">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderGridView(assets) {
  const container = document.getElementById('inventory-grid-container');
  if (!container) return;

  container.innerHTML = assets.map(asset => {
    return `
      <div class="asset-card">
        <div class="asset-card-top">
          <div>
            <span class="asset-code-badge">${asset.code}</span>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">Área: ${escapeHtml(asset.area || 'General')}</div>
          </div>
          ${getStatusBadge(asset.status)}
        </div>
        
        <h4 class="asset-card-title">${escapeHtml(asset.brand)} ${escapeHtml(asset.model)}</h4>
        <p style="font-size: 0.76rem; color: var(--primary-600); font-weight: 600;">${escapeHtml(asset.computerType || 'Computador')}</p>
        
        <div class="asset-card-specs-list">
          <div class="spec-line">
            <span>Serial:</span>
            <span>${escapeHtml(asset.serial || 'S/N')}</span>
          </div>
          <div class="spec-line">
            <span>CPU:</span>
            <span>${escapeHtml(asset.processor || 'N/A')}</span>
          </div>
          <div class="spec-line">
            <span>RAM / Disco:</span>
            <span>${escapeHtml(asset.ram || '')} • ${escapeHtml(asset.disk1Capacity || '')}</span>
          </div>
          <div class="spec-line">
            <span>S.O.:</span>
            <span style="font-size: 0.72rem;">${escapeHtml(asset.os || 'N/A')}</span>
          </div>
          <div class="spec-line">
            <span>IP / Red:</span>
            <span>${escapeHtml(asset.ip || 'DHCP')} (${escapeHtml(asset.networkInUse || 'CABLE')})</span>
          </div>
          <div class="spec-line">
            <span>Sede / Custodio:</span>
            <span>${escapeHtml(asset.sede)} • ${escapeHtml(asset.assignedTo || '')}</span>
          </div>
        </div>

        <div class="asset-card-footer">
          <button class="btn btn-sm btn-primary" onclick="viewHojaDeVida('${asset.id}')">
            <i data-lucide="file-spreadsheet"></i> Hoja de Vida
          </button>
          <div class="action-btns-group">
            <button class="icon-button" onclick="showAssetQRCode('${asset.id}')" title="Etiqueta QR">
              <i data-lucide="qr-code"></i>
            </button>
            <button class="icon-button" onclick="openEditAssetModal('${asset.id}')" title="Editar">
              <i data-lucide="edit-3"></i>
            </button>
            <button class="icon-button" onclick="confirmDeleteAsset('${asset.id}')" title="Eliminar" style="color: var(--accent-rose);">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// --- MODAL: AGREGAR / EDITAR ACTIVO ---
function openNewAssetModal() {
  currentActiveAssetId = null;
  const form = document.getElementById('form-asset');
  if (form) form.reset();
  
  document.getElementById('modal-asset-title').textContent = 'Registrar Nueva Hoja de Vida de Equipo';
  document.getElementById('asset-id').value = '';
  
  suggestAssetCode();
  
  // Establecer fecha de inventario de hoy
  document.getElementById('asset-inv-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('asset-assign-date').value = new Date().toISOString().split('T')[0];
  
  openModal('modal-asset-form');
}

function openEditAssetModal(id) {
  const a = DB.getAssetById(id);
  if (!a) return;

  currentActiveAssetId = id;
  document.getElementById('modal-asset-title').textContent = `Editar Hoja de Vida: ${a.code} (${a.brand} ${a.model})`;
  
  document.getElementById('asset-id').value = a.id;
  document.getElementById('asset-area').value = a.area || 'COMERCIAL';
  document.getElementById('asset-computer-type').value = a.computerType || 'ALL IN ONE';
  document.getElementById('asset-brand').value = a.brand || '';
  document.getElementById('asset-model').value = a.model || '';
  document.getElementById('asset-purchase-date').value = a.purchaseDate || '';
  document.getElementById('asset-provider').value = a.provider || '';
  
  // Hardware
  document.getElementById('asset-code').value = a.code || '';
  document.getElementById('asset-serial').value = a.serial || '';
  document.getElementById('asset-processor').value = a.processor || '';
  document.getElementById('asset-gpu').value = a.gpu || '';
  document.getElementById('asset-ram').value = a.ram || '';
  
  // Disco 1
  document.getElementById('asset-d1-brand').value = a.disk1Brand || '';
  document.getElementById('asset-d1-cap').value = a.disk1Capacity || '';
  document.getElementById('asset-d1-tech').value = a.disk1Tech || 'Mecánico (HDD)';
  document.getElementById('asset-d1-serial').value = a.disk1Serial || '';
  document.getElementById('asset-d1-model').value = a.disk1Model || '';
  
  // Disco 2
  document.getElementById('asset-d2-brand').value = a.disk2Brand || '';
  document.getElementById('asset-d2-cap').value = a.disk2Capacity || '';
  document.getElementById('asset-d2-tech').value = a.disk2Tech || '';
  document.getElementById('asset-d2-serial').value = a.disk2Serial || '';
  document.getElementById('asset-d2-model').value = a.disk2Model || '';
  
  // Periféricos
  document.getElementById('asset-monitor-model').value = a.monitorBrandModel || '';
  document.getElementById('asset-monitor-plate').value = a.monitorPlate || '';
  document.getElementById('asset-keyboard-model').value = a.keyboardBrandModel || '';
  document.getElementById('asset-keyboard-plate').value = a.keyboardPlate || '';
  document.getElementById('asset-mouse-model').value = a.mouseBrandModel || '';
  document.getElementById('asset-mouse-plate').value = a.mousePlate || '';
  document.getElementById('asset-other-peripherals').value = a.otherPeripherals || '';
  
  // Red
  document.getElementById('asset-net-in-use').value = a.networkInUse || 'CABLE';
  document.getElementById('asset-net-hostname').value = a.networkHostname || '';
  document.getElementById('asset-ip').value = a.ip || '';
  document.getElementById('asset-mac').value = a.mac || '';
  document.getElementById('asset-net-card').value = a.networkCardBrand || '';
  document.getElementById('asset-net-speed').value = a.networkSpeed || '1 Gbps';
  document.getElementById('asset-domain').value = a.domain || '';
  
  // S.O.
  document.getElementById('asset-os').value = a.os || '';
  
  // Inventario
  document.getElementById('asset-inv-date').value = a.inventoryDate || '';
  document.getElementById('asset-inventoried-by').value = a.inventoriedBy || '';
  document.getElementById('asset-inv-observations').value = a.inventoryObservations || '';
  document.getElementById('asset-approved-by').value = a.approvedBy || '';
  
  // Ubicación
  document.getElementById('asset-assigned-to').value = a.assignedTo || '';
  document.getElementById('asset-assigned-role').value = a.assignedRole || '';
  document.getElementById('asset-sede').value = a.sede || 'YLDC Potosí';
  document.getElementById('asset-location').value = a.location || '';
  document.getElementById('asset-address').value = a.physicalAddress || '';
  document.getElementById('asset-assign-date').value = a.assignmentDate || '';
  
  // Estado y Recomendaciones
  document.getElementById('asset-status').value = a.status || 'operativo';
  document.getElementById('asset-condition').value = a.condition || 'Bueno';
  document.getElementById('asset-recommendations').value = a.recommendations || '';
  document.getElementById('asset-value').value = a.estimatedValue || 0;

  openModal('modal-asset-form');
}

function suggestAssetCode() {
  const sede = document.getElementById('asset-sede')?.value || 'YLDC Potosí';
  const prefix = sede === 'YLDC Potosí' ? 'FND-POT' : sede === 'Altos del Cabo' ? 'FND-CABO' : 'FND-ADM';
  const assets = DB.getAssets();
  const nextNum = String(assets.length + 1).padStart(3, '0');
  const codeEl = document.getElementById('asset-code');
  if (codeEl && !codeEl.value) {
    codeEl.value = `${prefix}-${nextNum}`;
  }
}

function handleSaveAssetForm(e) {
  e.preventDefault();

  const id = document.getElementById('asset-id').value;
  const assetData = {
    id: id || undefined,
    area: document.getElementById('asset-area').value.trim().toUpperCase(),
    computerType: document.getElementById('asset-computer-type').value,
    category: document.getElementById('asset-computer-type').value === 'PORTÁTIL' ? 'laptop' : 'desktop',
    brand: document.getElementById('asset-brand').value.trim(),
    model: document.getElementById('asset-model').value.trim(),
    purchaseDate: document.getElementById('asset-purchase-date').value,
    provider: document.getElementById('asset-provider').value.trim(),
    
    // Hardware
    code: document.getElementById('asset-code').value.trim().toUpperCase(),
    serial: document.getElementById('asset-serial').value.trim(),
    processor: document.getElementById('asset-processor').value.trim(),
    gpu: document.getElementById('asset-gpu').value.trim(),
    ram: document.getElementById('asset-ram').value.trim(),
    
    // Disco 1
    disk1Brand: document.getElementById('asset-d1-brand').value.trim(),
    disk1Capacity: document.getElementById('asset-d1-cap').value.trim(),
    disk1Tech: document.getElementById('asset-d1-tech').value,
    disk1Serial: document.getElementById('asset-d1-serial').value.trim(),
    disk1Model: document.getElementById('asset-d1-model').value.trim(),
    
    // Disco 2
    disk2Brand: document.getElementById('asset-d2-brand').value.trim(),
    disk2Capacity: document.getElementById('asset-d2-cap').value.trim(),
    disk2Tech: document.getElementById('asset-d2-tech').value,
    disk2Serial: document.getElementById('asset-d2-serial').value.trim(),
    disk2Model: document.getElementById('asset-d2-model').value.trim(),
    
    // Periféricos
    monitorBrandModel: document.getElementById('asset-monitor-model').value.trim(),
    monitorPlate: document.getElementById('asset-monitor-plate').value.trim(),
    keyboardBrandModel: document.getElementById('asset-keyboard-model').value.trim(),
    keyboardPlate: document.getElementById('asset-keyboard-plate').value.trim(),
    mouseBrandModel: document.getElementById('asset-mouse-model').value.trim(),
    mousePlate: document.getElementById('asset-mouse-plate').value.trim(),
    otherPeripherals: document.getElementById('asset-other-peripherals').value.trim(),
    
    // Red
    networkInUse: document.getElementById('asset-net-in-use').value,
    networkHostname: document.getElementById('asset-net-hostname').value.trim(),
    ip: document.getElementById('asset-ip').value.trim(),
    mac: document.getElementById('asset-mac').value.trim(),
    networkCardBrand: document.getElementById('asset-net-card').value.trim(),
    networkSpeed: document.getElementById('asset-net-speed').value.trim(),
    domain: document.getElementById('asset-domain').value.trim(),
    
    // S.O.
    os: document.getElementById('asset-os').value.trim(),
    
    // Inventario
    inventoryDate: document.getElementById('asset-inv-date').value,
    inventoriedBy: document.getElementById('asset-inventoried-by').value.trim(),
    inventoryObservations: document.getElementById('asset-inv-observations').value.trim(),
    approvedBy: document.getElementById('asset-approved-by').value.trim(),
    
    // Ubicación
    assignedTo: document.getElementById('asset-assigned-to').value.trim(),
    assignedRole: document.getElementById('asset-assigned-role').value.trim(),
    sede: document.getElementById('asset-sede').value,
    location: document.getElementById('asset-location').value.trim(),
    physicalAddress: document.getElementById('asset-address').value.trim(),
    assignmentDate: document.getElementById('asset-assign-date').value,
    
    // Estado y Recomendaciones
    status: document.getElementById('asset-status').value,
    condition: document.getElementById('asset-condition').value,
    recommendations: document.getElementById('asset-recommendations').value.trim(),
    estimatedValue: Number(document.getElementById('asset-value').value) || 0
  };

  if (!assetData.code || !assetData.brand || !assetData.model) {
    showToast('Por favor completa los campos obligatorios (Placa, Marca y Modelo).', 'error');
    return;
  }

  // Verificar código único
  if (!id) {
    const existing = DB.getAssetByCode(assetData.code);
    if (existing) {
      showToast(`Ya existe un equipo registrado con la placa ${assetData.code}.`, 'error');
      return;
    }
  }

  DB.saveAsset(assetData);
  closeModal('modal-asset-form');
  showToast(id ? 'Hoja de vida actualizada con éxito.' : 'Nueva hoja de vida de equipo registrada.', 'success');
  applyInventoryFilters();
  renderDashboard();
}

function confirmDeleteAsset(id) {
  const asset = DB.getAssetById(id);
  if (!asset) return;

  if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el equipo "${asset.code} - ${asset.brand} ${asset.model}"?`)) {
    DB.deleteAsset(id);
    showToast('Equipo eliminado del inventario.', 'info');
    applyInventoryFilters();
    renderDashboard();
  }
}

// --- VISTA OFICIAL: HOJA DE VIDA DE EQUIPO DE CÓMPUTO (ESTILO EXCEL / OFICIAL) ---
function viewHojaDeVida(id) {
  const a = DB.getAssetById(id);
  if (!a) return;

  const container = document.getElementById('hoja-de-vida-content');
  if (!container) return;

  container.innerHTML = `
    <div class="hoja-de-vida-container printable-area">
      
      <!-- Encabezado Institucional -->
      <div class="hdv-top-header">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 36px; height: 36px; background: #1b5e20; color: #fff; font-weight: 800; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">F</div>
          <div>
            <div style="font-weight: 800; font-size: 1rem; color: #1b5e20; letter-spacing: -0.01em;">FUNDACIÓN FONDACIO COLOMBIA</div>
            <div style="font-size: 0.72rem; color: #64748b;">NIT: 900.384.129-5 • Sistema de Gestión Tecnológica</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 800; font-size: 0.95rem; color: #334155;">HOJA DE VIDA DE EQUIPO DE CÓMPUTO</div>
          <div style="font-family: monospace; font-weight: 700; color: #1b5e20;">PLACA: ${a.code}</div>
        </div>
      </div>

      <table class="hdv-table">
        <tbody>
          <!-- Cabecera de Área y Tipo -->
          <tr>
            <td class="hdv-label" style="width: 18%;">Área</td>
            <td class="hdv-value" style="width: 32%; text-align: center; font-weight: 700; text-transform: uppercase;">${escapeHtml(a.area || 'COMERCIAL / FORMACIÓN')}</td>
            <td class="hdv-label" style="width: 18%;">Tipo Computador</td>
            <td class="hdv-value" style="width: 32%; text-align: center; font-weight: 700; text-transform: uppercase;">${escapeHtml(a.computerType || 'ALL IN ONE')}</td>
          </tr>

          <!-- 1. DATOS DEL EQUIPO -->
          <tr>
            <td colspan="4" class="hdv-section-header">1. DATOS DEL EQUIPO</td>
          </tr>
          <tr>
            <td class="hdv-label">Marca</td>
            <td class="hdv-value">${escapeHtml(a.brand || 'HP')}</td>
            <td class="hdv-label">Modelo</td>
            <td class="hdv-value">${escapeHtml(a.model || '')}</td>
          </tr>
          <tr>
            <td class="hdv-label">Fecha de Compra / Ingreso</td>
            <td class="hdv-value">${a.purchaseDate || 'No registrada'}</td>
            <td class="hdv-label">Proveedor / Donante</td>
            <td class="hdv-value">${escapeHtml(a.provider || 'Fondacio Colombia')}</td>
          </tr>

          <!-- 2. DETALLE HARDWARE -->
          <tr>
            <td colspan="4" class="hdv-section-header">2. DETALLE HARDWARE</td>
          </tr>
          <tr>
            <td class="hdv-label">Placa Inventario</td>
            <td class="hdv-value" style="font-family: monospace; font-weight: 800; color: #1b5e20;">${a.code}</td>
            <td class="hdv-label">Marca y/o Modelo Monitor</td>
            <td class="hdv-value">${escapeHtml(a.monitorBrandModel || 'Integrado')}</td>
          </tr>
          <tr>
            <td class="hdv-label">SERIAL Computador</td>
            <td class="hdv-value" style="font-family: monospace;">${escapeHtml(a.serial || 'S/N')}</td>
            <td class="hdv-label">Placa Monitor</td>
            <td class="hdv-value">${escapeHtml(a.monitorPlate || 'N/A')}</td>
          </tr>
          <tr>
            <td class="hdv-label">CPU (Procesador)</td>
            <td class="hdv-value">${escapeHtml(a.processor || 'N/A')}</td>
            <td class="hdv-label">Marca y/o Modelo Teclado</td>
            <td class="hdv-value">${escapeHtml(a.keyboardBrandModel || 'Estándar')}</td>
          </tr>
          <tr>
            <td class="hdv-label">TARJETA DE VIDEO</td>
            <td class="hdv-value">${escapeHtml(a.gpu || 'Integrada')}</td>
            <td class="hdv-label">Placa Teclado</td>
            <td class="hdv-value">${escapeHtml(a.keyboardPlate || '-')}</td>
          </tr>
          <tr>
            <td class="hdv-label">Memoria RAM</td>
            <td class="hdv-value" style="font-weight: 700;">${escapeHtml(a.ram || '4 GB')}</td>
            <td class="hdv-label">Marca y/o Modelo Mouse</td>
            <td class="hdv-value">${escapeHtml(a.mouseBrandModel || 'Óptico')}</td>
          </tr>

          <!-- Subtabla Disco Duro 1 -->
          <tr>
            <td rowspan="2" class="hdv-label" style="text-align: center;">Disco Duro 1</td>
            <td colspan="3" style="padding: 0;">
              <table style="width: 100%; border-collapse: collapse; border: none; font-size: 0.78rem;">
                <tr style="background: #f8fafc;">
                  <td style="border: none; border-right: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8; font-weight: 600; width: 33%; padding: 3px 6px;">Marca: <strong>${escapeHtml(a.disk1Brand || 'Hitachi')}</strong></td>
                  <td style="border: none; border-right: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8; font-weight: 600; width: 33%; padding: 3px 6px;">Capacidad: <strong>${escapeHtml(a.disk1Capacity || '1 TB')}</strong></td>
                  <td style="border: none; border-bottom: 1px solid #94a3b8; font-weight: 600; width: 34%; padding: 3px 6px;">Tecnología: <strong>${escapeHtml(a.disk1Tech || 'Mecánico')}</strong></td>
                </tr>
                <tr>
                  <td colspan="2" style="border: none; border-right: 1px solid #94a3b8; padding: 3px 6px;">Serial: <span style="font-family: monospace;">${escapeHtml(a.disk1Serial || '-')}</span></td>
                  <td style="border: none; padding: 3px 6px;">Modelo: ${escapeHtml(a.disk1Model || '-')}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr></tr>

          <!-- Subtabla Disco Duro 2 (si aplica) -->
          <tr>
            <td rowspan="2" class="hdv-label" style="text-align: center;">Disco Duro 2</td>
            <td colspan="3" style="padding: 0;">
              <table style="width: 100%; border-collapse: collapse; border: none; font-size: 0.78rem;">
                <tr style="background: #f8fafc;">
                  <td style="border: none; border-right: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8; font-weight: 600; width: 33%; padding: 3px 6px;">Marca: <strong>${escapeHtml(a.disk2Brand || '-')}</strong></td>
                  <td style="border: none; border-right: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8; font-weight: 600; width: 33%; padding: 3px 6px;">Capacidad: <strong>${escapeHtml(a.disk2Capacity || '-')}</strong></td>
                  <td style="border: none; border-bottom: 1px solid #94a3b8; font-weight: 600; width: 34%; padding: 3px 6px;">Tecnología: <strong>${escapeHtml(a.disk2Tech || '-')}</strong></td>
                </tr>
                <tr>
                  <td colspan="2" style="border: none; border-right: 1px solid #94a3b8; padding: 3px 6px;">Serial: <span style="font-family: monospace;">${escapeHtml(a.disk2Serial || '-')}</span></td>
                  <td style="border: none; padding: 3px 6px;">Modelo: ${escapeHtml(a.disk2Model || '-')}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr></tr>

          <tr>
            <td class="hdv-label">Otros Accesorios</td>
            <td colspan="3" class="hdv-value">${escapeHtml(a.otherPeripherals || 'Cable de Poder, Cargador')}</td>
          </tr>

          <!-- 3. CONFIGURACION DE RED -->
          <tr>
            <td colspan="4" class="hdv-section-header">3. CONFIGURACIÓN DE RED</td>
          </tr>
          <tr>
            <td class="hdv-label">Red en Uso</td>
            <td class="hdv-value" style="font-weight: 700;">${escapeHtml(a.networkInUse || 'CABLE')}</td>
            <td class="hdv-label">Nombre en la Red (Host)</td>
            <td class="hdv-value" style="font-weight: 700;">${escapeHtml(a.networkHostname || 'Asistente')}</td>
          </tr>
          <tr>
            <td class="hdv-label">Dirección IP</td>
            <td class="hdv-value" style="font-family: monospace; font-weight: 700;">${escapeHtml(a.ip || '192.168.1.122')}</td>
            <td class="hdv-label">Dirección MAC</td>
            <td class="hdv-value" style="font-family: monospace; font-weight: 700;">${escapeHtml(a.mac || 'EE:9A:8F:D5:DD:58')}</td>
          </tr>
          <tr>
            <td class="hdv-label">Adaptador de Red (Marca)</td>
            <td class="hdv-value">${escapeHtml(a.networkCardBrand || 'Realtek PCIe GbE')}</td>
            <td class="hdv-label">Velocidad / Dominio</td>
            <td class="hdv-value">${escapeHtml(a.networkSpeed || '1 Gbps')} • Dominio: ${escapeHtml(a.domain || 'WORKGROUP')}</td>
          </tr>

          <!-- 4. SISTEMA OPERATIVO INSTALADO -->
          <tr>
            <td colspan="4" class="hdv-section-header">4. SISTEMA OPERATIVO INSTALADO</td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 8px 12px; font-weight: 700; font-size: 0.88rem; background: #f8fafc; color: #0f172a;">
              💻 ${escapeHtml(a.os || 'Microsoft Windows 10 Education 32-Bit')}
            </td>
          </tr>

          <!-- 5. INVENTARIO COMPUTADOR (Auditoría) -->
          <tr>
            <td colspan="4" class="hdv-section-header">5. INVENTARIO COMPUTADOR</td>
          </tr>
          <tr>
            <td class="hdv-label">Fecha Levantamiento</td>
            <td class="hdv-value">${a.inventoryDate || '17 de Noviembre de 2021'}</td>
            <td class="hdv-label">Persona / Entidad Auditora</td>
            <td class="hdv-value">${escapeHtml(a.inventoriedBy || 'Trust 4p, Nicolás Espitia')}</td>
          </tr>
          <tr>
            <td class="hdv-label">Observaciones Levantamiento</td>
            <td colspan="3" class="hdv-value" style="font-style: italic; color: #475569;">
              "${escapeHtml(a.inventoryObservations || 'Se hace el inventario lógico con el programa WinAudit, se adjunta en la entrega del inventario.')}"
            </td>
          </tr>

          <!-- 6. UBICACIÓN ACTUAL -->
          <tr>
            <td colspan="4" class="hdv-section-header">6. UBICACIÓN ACTUAL</td>
          </tr>
          <tr>
            <td class="hdv-label">Usuario Responsable</td>
            <td class="hdv-value" style="font-weight: 700;">${escapeHtml(a.assignedTo || 'Auxiliar')} (${escapeHtml(a.assignedRole || 'Responsable')})</td>
            <td class="hdv-label">Fecha Asignación</td>
            <td class="hdv-value">${a.assignmentDate || '17/11/2021'}</td>
          </tr>
          <tr>
            <td class="hdv-label">Sede y Dirección de Ubicación</td>
            <td colspan="3" class="hdv-value">
              <strong>${escapeHtml(a.sede)}</strong> • ${escapeHtml(a.location || 'Sala de Sistemas')} • ${escapeHtml(a.physicalAddress || 'Bogotá D.C.')}
            </td>
          </tr>

          <!-- 7. RECOMENDACIONES Y/O OBSERVACIONES -->
          <tr>
            <td colspan="4" class="hdv-section-header">7. RECOMENDACIONES Y/O OBSERVACIONES</td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 10px 12px; font-size: 0.84rem; background: #fefce8; color: #854d0e; border-bottom: 2px solid #334155;">
              ⚠️ <strong>Recomendación Técnica:</strong> ${escapeHtml(a.recommendations || 'Cambiar el sistema operativo a Windows 10 Pro 64 bits')}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Firmas -->
      <div class="hdv-signature-area">
        <div style="border-top: 1px solid #334155; text-align: center; padding-top: 5px; font-size: 0.78rem;">
          <strong>Aceptación Empresa / Auditor</strong><br>
          <span>${escapeHtml(a.approvedBy || a.inventoriedBy || 'Nicolás Espitia')}</span><br>
          <span style="color: #64748b; font-size: 0.7rem;">Firma y Sello</span>
        </div>
        <div style="border-top: 1px solid #334155; text-align: center; padding-top: 5px; font-size: 0.78rem;">
          <strong>Firma Responsable / Custodio</strong><br>
          <span>${escapeHtml(a.assignedTo || 'Auxiliar')}</span><br>
          <span style="color: #64748b; font-size: 0.7rem;">C.C. ________________________</span>
        </div>
      </div>

    </div>
  `;

  document.getElementById('btn-hdv-edit').onclick = () => {
    closeModal('modal-hoja-vida');
    openEditAssetModal(a.id);
  };

  document.getElementById('btn-hdv-tag').onclick = () => {
    closeModal('modal-hoja-vida');
    showAssetQRCode(a.id);
  };

  openModal('modal-hoja-vida');
  if (window.lucide) lucide.createIcons();
}

// --- MODAL: GENERACIÓN DE ETIQUETA QR ---
function showAssetQRCode(id) {
  const asset = DB.getAssetById(id);
  if (!asset) return;

  const holder = document.getElementById('qr-canvas-target');
  if (!holder) return;

  holder.innerHTML = '';

  const qrPayload = `FONDACIO COLOMBIA | ACTIVO: ${asset.code} | SERIAL: ${asset.serial || 'S/N'} | SEDE: ${asset.sede}`;

  let qrGenerated = false;

  if (typeof QRCode !== 'undefined') {
    try {
      new QRCode(holder, {
        text: qrPayload,
        width: 140,
        height: 140,
        colorDark: '#0f2d18',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.L
      });
      qrGenerated = true;
    } catch (err) {
      console.warn('QRCode.js fallback:', err);
    }
  }

  if (!qrGenerated) {
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrPayload)}`;
    img.alt = 'QR Code';
    img.style.width = '140px';
    img.style.height = '140px';
    holder.appendChild(img);
  }

  document.getElementById('qr-label-code-text').textContent = asset.code;
  document.getElementById('qr-label-name-text').textContent = `${asset.brand} ${asset.model}`;
  document.getElementById('qr-label-sede-text').textContent = `${asset.sede} • ${asset.location || 'Inventario Central'}`;
  document.getElementById('qr-label-serial-text').textContent = `Serial: ${asset.serial || 'S/N'}`;

  openModal('modal-qr-tag');
}

function printCurrentQRTag() {
  window.print();
}

// --- EXPORTACIÓN EXCEL COMPLETA CON TODOS LOS CAMPOS DE LA HOJA DE VIDA ---
function exportInventoryToExcel() {
  const assets = DB.getAssets();
  if (assets.length === 0) {
    showToast('No hay activos para exportar.', 'info');
    return;
  }

  const exportRows = assets.map((a, idx) => ({
    'N°': idx + 1,
    'Área': a.area || 'COMERCIAL',
    'Tipo Computador': a.computerType || 'ALL IN ONE',
    'Marca': a.brand,
    'Modelo': a.model,
    'Fecha de Compra': a.purchaseDate,
    'Proveedor / Donante': a.provider,
    'Placa Inventario': a.code,
    'SERIAL Computador': a.serial,
    'CPU (Procesador)': a.processor,
    'Tarjeta de Video': a.gpu,
    'Memoria RAM': a.ram,
    
    // Disco 1
    'Disco 1 - Marca': a.disk1Brand,
    'Disco 1 - Capacidad': a.disk1Capacity,
    'Disco 1 - Tecnología': a.disk1Tech,
    'Disco 1 - Serial': a.disk1Serial,
    'Disco 1 - Modelo': a.disk1Model,
    
    // Disco 2
    'Disco 2 - Marca': a.disk2Brand,
    'Disco 2 - Capacidad': a.disk2Capacity,
    'Disco 2 - Tecnología': a.disk2Tech,
    'Disco 2 - Serial': a.disk2Serial,
    'Disco 2 - Modelo': a.disk2Model,
    
    // Periféricos
    'Monitor (Marca/Modelo)': a.monitorBrandModel,
    'Placa Monitor': a.monitorPlate,
    'Teclado (Marca/Modelo)': a.keyboardBrandModel,
    'Placa Teclado': a.keyboardPlate,
    'Mouse (Marca/Modelo)': a.mouseBrandModel,
    'Placa Mouse': a.mousePlate,
    'Otros Accesorios': a.otherPeripherals,
    
    // Red
    'Red en Uso': a.networkInUse,
    'Nombre en la Red': a.networkHostname,
    'Dirección IP': a.ip,
    'Dirección MAC': a.mac,
    'Tarjeta de Red': a.networkCardBrand,
    'Velocidad de Red': a.networkSpeed,
    'Dominio': a.domain,
    
    // Sistema Operativo
    'Sistema Operativo': a.os,
    
    // Inventario
    'Fecha Inventario': a.inventoryDate,
    'Persona que realizó inventario': a.inventoriedBy,
    'Observaciones Levantamiento': a.inventoryObservations,
    'Aprobado por': a.approvedBy,
    
    // Ubicación
    'Usuario Responsable': a.assignedTo,
    'Rol Responsable': a.assignedRole,
    'Sede': a.sede,
    'Ubicación / Sala': a.location,
    'Dirección Física': a.physicalAddress,
    'Fecha Asignación': a.assignmentDate,
    
    // Estado y Recomendaciones
    'Estado Operativo': a.status,
    'Estado Físico': a.condition,
    'Recomendaciones Técnicas': a.recommendations,
    'Valor Estimado (COP)': a.estimatedValue
  }));

  if (typeof XLSX !== 'undefined') {
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hojas de Vida Cómputo');
    
    const colWidths = Object.keys(exportRows[0] || {}).map(key => ({
      wch: Math.max(key.length, 16)
    }));
    ws['!cols'] = colWidths;

    const fileName = `Hojas_De_Vida_Computo_Fondacio_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast('Hojas de vida exportadas exitosamente a Excel.', 'success');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
