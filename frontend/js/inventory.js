/**
 * FONDACIO COLOMBIA - SISTEMA DE INVENTARIO
 * Módulo de Gestión de Activos de Hardware y Hojas de Vida Oficiales
 * Soporte Completo para Levantamiento Técnico, Diagnóstico de Software y Exportación Multi-Hoja
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
    countBadge.textContent = `${assets.length} equipos censados`;
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
    mantenimiento: { label: 'En Mantenimiento', class: 'status-mantenimiento' },
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

function formatCurrencyCOP(amount) {
  if (!amount || isNaN(amount)) return '$ 0 COP';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount);
}

function handleImageFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (file.size > 3 * 1024 * 1024) {
    showToast('La imagen es algo pesada (>3MB). Se optimizará para almacenamiento local.', 'info');
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const urlInput = document.getElementById('asset-image-url');
    const preview = document.getElementById('asset-image-preview');
    if (urlInput) urlInput.value = dataUrl;
    if (preview) preview.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

function handleImageUrlChange(url) {
  const preview = document.getElementById('asset-image-preview');
  if (preview) {
    preview.src = url.trim() || 'img/dell_latitude_7480.jpg';
  }
}

function setAssetImagePreset(presetUrl) {
  const urlInput = document.getElementById('asset-image-url');
  const preview = document.getElementById('asset-image-preview');
  if (urlInput) urlInput.value = presetUrl;
  if (preview) preview.src = presetUrl;
}

function clearAssetImage() {
  const fileInput = document.getElementById('asset-image-file');
  const urlInput = document.getElementById('asset-image-url');
  const preview = document.getElementById('asset-image-preview');
  if (fileInput) fileInput.value = '';
  if (urlInput) urlInput.value = '';
  if (preview) preview.src = 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&auto=format&fit=crop&q=60';
}

function updateAssetPricePreview(val) {
  const preview = document.getElementById('asset-value-formatted-preview');
  if (!preview) return;
  const num = Number(val) || 0;
  preview.textContent = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(num);
}

function renderTableView(assets) {
  const tbody = document.getElementById('inventory-table-body');
  if (!tbody) return;

  tbody.innerHTML = assets.map(asset => {
    const isTablet = asset.category === 'tablet' || (asset.code && asset.code.startsWith('TAB'));
    const diskInfo = asset.disk1Capacity ? `${asset.disk1Capacity} (${asset.disk1Tech || 'SSD'})` : 'eMMC';
    const hostOrDevice = asset.networkHostname || (isTablet ? asset.code : 'Sin Host');
    const licenseAlertBadge = asset.licenseState === 'NO ACTIVADO' 
      ? '<span style="color: var(--accent-rose); font-weight: 700; font-size: 0.7rem;">⚠️ Requiere Licencia</span>'
      : '';
    const imgUrl = asset.image || (isTablet ? 'img/tablet_educativa_android.jpg' : 'img/dell_latitude_7480.jpg');

    return `
      <tr>
        <td>
          <span class="asset-code-badge">${asset.code}</span>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">Área: ${escapeHtml(asset.area || 'General')}</div>
          ${licenseAlertBadge ? `<div style="margin-top: 0.2rem;">${licenseAlertBadge}</div>` : ''}
        </td>
        <td>
          <div class="asset-table-item-wrap">
            <img src="${imgUrl}" class="asset-table-thumb" alt="${escapeHtml(asset.model)}" onerror="this.src='https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=200&auto=format&fit=crop&q=60'">
            <div class="asset-main-info" style="flex: 1;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                <span class="asset-title">${escapeHtml(asset.brand)} ${escapeHtml(asset.model)}</span>
                ${asset.estimatedValue ? `<span class="asset-price-badge">${formatCurrencyCOP(asset.estimatedValue)}</span>` : ''}
              </div>
              <span class="asset-specs">
                <strong>${escapeHtml(asset.processor || 'CPU')}</strong> 
                ${asset.cpuCores ? `(${escapeHtml(asset.cpuCores)})` : ''}
              </span>
              <span style="font-size: 0.72rem; color: var(--primary-600); font-weight: 600;">
                RAM: ${escapeHtml(asset.ram || '')} | Almacenamiento: ${escapeHtml(diskInfo)}
                ${asset.diskFree ? ` • ${escapeHtml(asset.diskFree)} libres` : ''}
              </span>
              <span style="font-size: 0.7rem; color: var(--text-secondary);">
                S.O.: ${escapeHtml(asset.os || 'N/A')}
              </span>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight: 600; font-size: 0.82rem; color: var(--text-main);">${escapeHtml(hostOrDevice)}</div>
          <div style="font-size: 0.72rem; color: var(--text-secondary);">IP: <strong>${escapeHtml(asset.ip || 'DHCP')}</strong></div>
          <div style="font-size: 0.7rem; color: var(--primary-600);">SSID: ${escapeHtml(asset.wifiSSID || 'ALTINET FONDACIO')}</div>
          ${asset.mac ? `<div style="font-size: 0.68rem; color: var(--text-muted); font-family: monospace;">MAC: ${escapeHtml(asset.mac)}</div>` : ''}
        </td>
        <td>
          <div class="badge-sede">
            ${getSedeDot(asset.sede)}
            <span>${escapeHtml(asset.sede)}</span>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-secondary);">${escapeHtml(asset.location || 'Sede Fondacio')}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">Custodio: ${escapeHtml(asset.assignedTo || 'Sin asignar')}</div>
        </td>
        <td>
          ${getStatusBadge(asset.status)}
          ${asset.obsolescenceStrategy ? `<div style="font-size: 0.68rem; color: var(--primary-700); margin-top: 0.3rem;">🌱 Entorno Cloud Web</div>` : ''}
        </td>
        <td>
          <div class="action-btns-group">
            <button class="btn btn-sm btn-primary" onclick="viewHojaDeVida('${asset.id}')" title="Ver e Imprimir Hoja de Vida Completa">
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
    const isTablet = asset.category === 'tablet' || (asset.code && asset.code.startsWith('TAB'));
    const diskInfo = asset.disk1Capacity ? `${asset.disk1Capacity} (${asset.disk1Tech || 'SSD'})` : 'eMMC';
    const imgUrl = asset.image || (isTablet ? 'img/tablet_educativa_android.jpg' : 'img/dell_latitude_7480.jpg');

    return `
      <div class="asset-card">
        <div class="asset-card-img-wrap">
          <img src="${imgUrl}" alt="${escapeHtml(asset.brand)} ${escapeHtml(asset.model)}" class="asset-card-img" onerror="this.src='https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=60'">
          ${asset.estimatedValue ? `<span class="asset-price-badge">${formatCurrencyCOP(asset.estimatedValue)}</span>` : ''}
        </div>
        <div class="asset-card-top">
          <div>
            <span class="asset-code-badge">${asset.code}</span>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">${escapeHtml(asset.area || 'General')}</div>
          </div>
          ${getStatusBadge(asset.status)}
        </div>
        
        <h4 class="asset-card-title">${escapeHtml(asset.brand)} ${escapeHtml(asset.model)}</h4>
        <p style="font-size: 0.76rem; color: var(--primary-600); font-weight: 600;">
          ${isTablet ? '📱 TABLET EDUCATIVA' : `💻 ${escapeHtml(asset.computerType || 'PORTÁTIL')}`}
        </p>
        
        <div class="asset-card-specs-list">
          <div class="spec-line">
            <span>Host / ID:</span>
            <strong>${escapeHtml(asset.networkHostname || asset.code)}</strong>
          </div>
          <div class="spec-line">
            <span>CPU:</span>
            <span>${escapeHtml(asset.processor || 'N/A')}</span>
          </div>
          <div class="spec-line">
            <span>RAM / Disco:</span>
            <span>${escapeHtml(asset.ram || '')} • ${escapeHtml(diskInfo)}</span>
          </div>
          <div class="spec-line">
            <span>S.O. / Build:</span>
            <span style="font-size: 0.72rem;">${escapeHtml(asset.os || 'N/A')}</span>
          </div>
          <div class="spec-line">
            <span>IP / Red:</span>
            <span>${escapeHtml(asset.ip || 'DHCP')} (${escapeHtml(asset.wifiSSID || 'Wi-Fi')})</span>
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
  
  // Image & price defaults
  const imgUrlEl = document.getElementById('asset-image-url');
  const imgPreviewEl = document.getElementById('asset-image-preview');
  const valEl = document.getElementById('asset-value');
  if (imgUrlEl) imgUrlEl.value = 'img/dell_latitude_7480.jpg';
  if (imgPreviewEl) imgPreviewEl.src = 'img/dell_latitude_7480.jpg';
  if (valEl) valEl.value = 0;
  updateAssetPricePreview(0);

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
  document.getElementById('asset-area').value = a.area || 'ADMINISTRACIÓN / OFIMÁTICA';
  document.getElementById('asset-computer-type').value = a.computerType || 'PORTÁTIL';
  document.getElementById('asset-brand').value = a.brand || '';
  document.getElementById('asset-model').value = a.model || '';
  document.getElementById('asset-purchase-date').value = a.purchaseDate || '';
  document.getElementById('asset-provider').value = a.provider || '';

  // Imagen y Valor Estimado
  const defaultImg = a.category === 'tablet' || (a.code && a.code.startsWith('TAB')) ? 'img/tablet_educativa_android.jpg' : 'img/dell_latitude_7480.jpg';
  const imgUrlEl = document.getElementById('asset-image-url');
  const imgPreviewEl = document.getElementById('asset-image-preview');
  const valEl = document.getElementById('asset-value');
  if (imgUrlEl) imgUrlEl.value = a.image || defaultImg;
  if (imgPreviewEl) imgPreviewEl.src = a.image || defaultImg;
  if (valEl) valEl.value = a.estimatedValue || 0;
  updateAssetPricePreview(a.estimatedValue || 0);
  
  // Hardware
  document.getElementById('asset-code').value = a.code || '';
  document.getElementById('asset-serial').value = a.serial || '';
  document.getElementById('asset-processor').value = a.processor || '';
  document.getElementById('asset-gpu').value = a.gpu || '';
  document.getElementById('asset-ram').value = a.ram || '';
  
  // Disco 1
  document.getElementById('asset-d1-brand').value = a.disk1Brand || '';
  document.getElementById('asset-d1-cap').value = a.disk1Capacity || '';
  document.getElementById('asset-d1-tech').value = a.disk1Tech || 'SSD SATA';
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
  document.getElementById('asset-net-in-use').value = a.networkInUse || 'WIFI';
  document.getElementById('asset-net-hostname').value = a.networkHostname || '';
  document.getElementById('asset-ip').value = a.ip || '';
  document.getElementById('asset-mac').value = a.mac || '';
  document.getElementById('asset-net-card').value = a.networkCardBrand || '';
  document.getElementById('asset-net-speed').value = a.networkSpeed || '867 Mbps';
  document.getElementById('asset-domain').value = a.domain || 'WORKGROUP';
  
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
  document.getElementById('asset-sede').value = a.sede || 'Altos del Cabo';
  document.getElementById('asset-location').value = a.location || '';
  document.getElementById('asset-address').value = a.physicalAddress || '';
  document.getElementById('asset-assign-date').value = a.assignmentDate || '';
  
  // Estado y Recomendaciones
  document.getElementById('asset-status').value = a.status || 'operativo';
  document.getElementById('asset-condition').value = a.condition || 'Excelente';
  document.getElementById('asset-recommendations').value = a.recommendations || '';

  openModal('modal-asset-form');
}

function suggestAssetCode() {
  const assets = DB.getAssets();
  const nextNum = String(assets.length + 1).padStart(2, '0');
  const codeEl = document.getElementById('asset-code');
  if (codeEl && !codeEl.value) {
    codeEl.value = `PC-${nextNum}`;
  }
}

function handleSaveAssetForm(e) {
  e.preventDefault();

  const id = document.getElementById('asset-id').value;
  const rawType = document.getElementById('asset-computer-type').value;
  const isTablet = rawType === 'TABLET' || rawType === 'MINIPC';
  const imgUrl = document.getElementById('asset-image-url')?.value.trim() || (isTablet ? 'img/tablet_educativa_android.jpg' : 'img/dell_latitude_7480.jpg');

  // Fallback defaults si los campos se dejan vacíos
  let rawCode = document.getElementById('asset-code').value.trim().toUpperCase();
  if (!rawCode) {
    const assets = DB.getAssets();
    rawCode = `PC-${String(assets.length + 1).padStart(2, '0')}`;
  }

  const rawBrand = document.getElementById('asset-brand').value.trim() || 'Sin Marca';
  const rawModel = document.getElementById('asset-model').value.trim() || (isTablet ? 'Tablet' : 'Equipo de Cómputo');
  const rawArea = document.getElementById('asset-area').value.trim().toUpperCase() || 'GENERAL';
  const rawSede = document.getElementById('asset-sede').value || 'Altos del Cabo';

  const assetData = {
    id: id || undefined,
    area: rawArea,
    computerType: rawType || 'PORTÁTIL',
    category: isTablet ? 'tablet' : rawType === 'PORTÁTIL' ? 'laptop' : 'desktop',
    brand: rawBrand,
    model: rawModel,
    purchaseDate: document.getElementById('asset-purchase-date').value || '',
    provider: document.getElementById('asset-provider').value.trim() || 'Inventario Institucional',
    image: imgUrl,
    
    // Hardware
    code: rawCode,
    serial: document.getElementById('asset-serial').value.trim() || 'S/N',
    processor: document.getElementById('asset-processor').value.trim() || '',
    gpu: document.getElementById('asset-gpu').value.trim() || '',
    ram: document.getElementById('asset-ram').value.trim() || '',
    
    // Disco 1
    disk1Brand: document.getElementById('asset-d1-brand').value.trim() || '',
    disk1Capacity: document.getElementById('asset-d1-cap').value.trim() || '',
    disk1Tech: document.getElementById('asset-d1-tech').value || 'SSD',
    disk1Serial: document.getElementById('asset-d1-serial').value.trim() || '',
    disk1Model: document.getElementById('asset-d1-model').value.trim() || '',
    
    // Disco 2
    disk2Brand: document.getElementById('asset-d2-brand').value.trim() || '',
    disk2Capacity: document.getElementById('asset-d2-cap').value.trim() || '',
    disk2Tech: document.getElementById('asset-d2-tech').value || '',
    disk2Serial: document.getElementById('asset-d2-serial').value.trim() || '',
    disk2Model: document.getElementById('asset-d2-model').value.trim() || '',
    
    // Periféricos
    monitorBrandModel: document.getElementById('asset-monitor-model').value.trim() || '',
    monitorPlate: document.getElementById('asset-monitor-plate').value.trim() || '',
    keyboardBrandModel: document.getElementById('asset-keyboard-model').value.trim() || '',
    keyboardPlate: document.getElementById('asset-keyboard-plate').value.trim() || '',
    mouseBrandModel: document.getElementById('asset-mouse-model').value.trim() || '',
    mousePlate: document.getElementById('asset-mouse-plate').value.trim() || '',
    otherPeripherals: document.getElementById('asset-other-peripherals').value.trim() || '',
    
    // Red
    networkInUse: document.getElementById('asset-net-in-use').value || 'WIFI',
    networkHostname: document.getElementById('asset-net-hostname').value.trim() || rawCode,
    ip: document.getElementById('asset-ip').value.trim() || 'DHCP',
    mac: document.getElementById('asset-mac').value.trim() || '',
    networkCardBrand: document.getElementById('asset-net-card').value.trim() || '',
    networkSpeed: document.getElementById('asset-net-speed').value.trim() || '',
    domain: document.getElementById('asset-domain').value.trim() || 'WORKGROUP',
    
    // S.O.
    os: document.getElementById('asset-os').value.trim() || '',
    
    // Inventario
    inventoryDate: document.getElementById('asset-inv-date').value || new Date().toISOString().split('T')[0],
    inventoriedBy: document.getElementById('asset-inventoried-by').value.trim() || 'Fondacio TIC',
    inventoryObservations: document.getElementById('asset-inv-observations').value.trim() || '',
    approvedBy: document.getElementById('asset-approved-by').value.trim() || '',
    
    // Ubicación
    assignedTo: document.getElementById('asset-assigned-to').value.trim() || 'Sin Asignar',
    assignedRole: document.getElementById('asset-assigned-role').value.trim() || '',
    sede: rawSede,
    location: document.getElementById('asset-location').value.trim() || 'Sede Fondacio',
    physicalAddress: document.getElementById('asset-address').value.trim() || '',
    assignmentDate: document.getElementById('asset-assign-date').value || '',
    
    // Estado y Recomendaciones
    status: document.getElementById('asset-status').value || 'operativo',
    condition: document.getElementById('asset-condition').value || 'Bueno',
    recommendations: document.getElementById('asset-recommendations').value.trim() || '',
    estimatedValue: Number(document.getElementById('asset-value').value) || 0
  };

  // Si no se editaba un activo existente y el código ya existe, asignarle un sufijo para no generar colisión
  if (!id) {
    const existing = DB.getAssetByCode(assetData.code);
    if (existing) {
      assetData.code = `${assetData.code}-${Date.now().toString().slice(-3)}`;
    }
  }

  DB.saveAsset(assetData);
  closeModal('modal-asset-form');
  showToast(id ? 'Hoja de vida actualizada con éxito.' : 'Nueva hoja de vida registrada con éxito.', 'success');
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

// --- VISTA OFICIAL: HOJA DE VIDA DE EQUIPO DE CÓMPUTO (ESTILO OFICIAL Y DETALLE TÉCNICO EXCEL) ---
function viewHojaDeVida(id) {
  const a = DB.getAssetById(id);
  if (!a) return;

  const container = document.getElementById('hoja-de-vida-content');
  if (!container) return;

  const isTablet = a.category === 'tablet' || (a.code && a.code.startsWith('TAB'));
  const imgUrl = a.image || (isTablet ? 'img/tablet_educativa_android.jpg' : 'img/dell_latitude_7480.jpg');

  container.innerHTML = `
    <div class="hoja-de-vida-container printable-area">
      
      <!-- Encabezado Institucional Oficial -->
      <div class="hdv-top-header">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 42px; height: 42px; background: #1b5e20; color: #fff; font-weight: 800; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">F</div>
          <div>
            <div style="font-weight: 800; font-size: 1.05rem; color: #1b5e20; letter-spacing: -0.01em;">FUNDACIÓN FONDACIO COLOMBIA</div>
            <div style="font-size: 0.75rem; color: #64748b;">NIT: 900.384.129-5 • Proyecto de Adecuación Tecnológica e Inventario</div>
            <div style="font-size: 0.72rem; color: #0284c7; font-weight: 600;">Sede: ${escapeHtml(a.sede)} • ${escapeHtml(a.location || 'Oficina')}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 800; font-size: 0.95rem; color: #1e293b;">HOJA DE VIDA TÉCNICA OFICIAL</div>
          <div style="font-family: monospace; font-weight: 800; font-size: 1.15rem; color: #1b5e20; background: #e8f5e9; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-top: 2px;">
            ID: ${a.code}
          </div>
          <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">Levantamiento: ${a.inventoryDate || 'Septiembre 2026'}</div>
        </div>
      </div>

      <!-- Ficha Visual del Equipo y Avalúo Comercial -->
      <div style="display: flex; gap: 1rem; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px;">
        <img src="${imgUrl}" alt="${escapeHtml(a.model)}" style="width: 130px; height: 90px; object-fit: cover; border-radius: 6px; border: 1px solid #94a3b8; background: #fff;" onerror="this.src='https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=300&auto=format&fit=crop&q=60'">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
            <span style="font-size: 1.05rem; font-weight: 800; color: #0f172a;">${escapeHtml(a.brand)} ${escapeHtml(a.model)}</span>
            <span style="background: #e8f5e9; color: #1b5e20; border: 1px solid #a5d6a7; padding: 3px 10px; border-radius: 20px; font-weight: 800; font-size: 0.85rem;">
              💰 Avalúo Estimado: ${formatCurrencyCOP(a.estimatedValue || 0)}
            </span>
          </div>
          <div style="font-size: 0.78rem; color: #475569; margin-top: 4px;">
            Estado de Conservación: <strong style="color: #1b5e20;">${escapeHtml(a.condition || 'Excelente')}</strong> • Tipo: <strong>${isTablet ? 'Tablet Educativa' : escapeHtml(a.computerType || 'Portátil')}</strong>
          </div>
          <div style="font-size: 0.73rem; color: #64748b; margin-top: 2px;">
            Responsable Asignado: <strong>${escapeHtml(a.assignedTo || 'Sin asignar')}</strong> (${escapeHtml(a.assignedRole || 'Personal Fondacio')})
          </div>
        </div>
      </div>

      <table class="hdv-table">
        <tbody>
          <!-- Fila de Identificación Rápida -->
          <tr>
            <td class="hdv-label" style="width: 18%;">Área / Dependencia</td>
            <td class="hdv-value" style="width: 32%; font-weight: 700;">${escapeHtml(a.area || 'ADMINISTRACIÓN / OFIMÁTICA')}</td>
            <td class="hdv-label" style="width: 18%;">Tipo de Dispositivo</td>
            <td class="hdv-value" style="width: 32%; font-weight: 700;">${isTablet ? 'TABLET EDUCATIVA' : escapeHtml(a.computerType || 'PORTÁTIL')}</td>
          </tr>

          <!-- 1. IDENTIFICACIÓN Y GENERALIDADES -->
          <tr>
            <td colspan="4" class="hdv-section-header">1. IDENTIFICACIÓN Y DATOS GENERALES DEL EQUIPO</td>
          </tr>
          <tr>
            <td class="hdv-label">Marca y Fabricante</td>
            <td class="hdv-value" style="font-weight: 700;">${escapeHtml(a.brand || 'Dell')}</td>
            <td class="hdv-label">Modelo Exacto</td>
            <td class="hdv-value" style="font-weight: 700;">${escapeHtml(a.model || '')}</td>
          </tr>
          <tr>
            <td class="hdv-label">Nombre de Equipo (Host)</td>
            <td class="hdv-value" style="font-family: monospace; font-weight: 700; color: #0369a1;">${escapeHtml(a.networkHostname || a.code)}</td>
            <td class="hdv-label">Cuenta / Usuario Local</td>
            <td class="hdv-value">${escapeHtml(a.assignedTo || 'Cuenta Local')}</td>
          </tr>
          <tr>
            <td class="hdv-label">ID Dispositivo (UUID)</td>
            <td class="hdv-value" style="font-family: monospace; font-size: 0.73rem;">${escapeHtml(a.uuid || 'N/A')}</td>
            <td class="hdv-label">ID del Producto / Serial</td>
            <td class="hdv-value" style="font-family: monospace; font-size: 0.73rem;">${escapeHtml(a.productId || a.serial || 'N/A')}</td>
          </tr>
          <tr>
            <td class="hdv-label">Fecha de Ingreso / Compra</td>
            <td class="hdv-value">${a.purchaseDate || 'Inventario Institucional'}</td>
            <td class="hdv-label">Proveedor / Donante</td>
            <td class="hdv-value">${escapeHtml(a.provider || 'Donación Fondacio')}</td>
          </tr>

          <!-- 2. DETALLE DE PROCESAMIENTO Y MEMORIA (CPU & RAM) -->
          <tr>
            <td colspan="4" class="hdv-section-header">2. ESPECIFICACIONES DE PROCESADOR Y MEMORIA (CPU & RAM)</td>
          </tr>
          <tr>
            <td class="hdv-label">Procesador (CPU)</td>
            <td class="hdv-value" style="font-weight: 700; color: #0f172a;">${escapeHtml(a.processor || 'N/A')}</td>
            <td class="hdv-label">Núcleos / Hilos</td>
            <td class="hdv-value">${escapeHtml(a.cpuCores || '2 núcleos / 4 hilos')}</td>
          </tr>
          <tr>
            <td class="hdv-label">Velocidad CPU</td>
            <td class="hdv-value">${escapeHtml(a.cpuSpeed || 'Base / Turbo')}</td>
            <td class="hdv-label">Caché CPU / Virtualización</td>
            <td class="hdv-value">${escapeHtml(a.cpuCache || 'L1 / L2 / L3')} • Virt: ${escapeHtml(a.virtualization || 'Habilitada')}</td>
          </tr>
          <tr>
            <td class="hdv-label">Memoria RAM Total</td>
            <td class="hdv-value" style="font-weight: 800; color: #1b5e20;">${escapeHtml(a.ram || '8.0 GB')} ${a.ramUsable ? `(Utilizable: ${escapeHtml(a.ramUsable)})` : ''}</td>
            <td class="hdv-label">Velocidad / Tipo RAM</td>
            <td class="hdv-value">${escapeHtml(a.ramSpeed || '2400 MHz')} • ${escapeHtml(a.ramType || 'SODIMM DDR4')}</td>
          </tr>
          <tr>
            <td class="hdv-label">Ranuras de Memoria</td>
            <td class="hdv-value">${escapeHtml(a.ramSlots || '1 de 2 en uso')}</td>
            <td class="hdv-label">RAM Reservada Hardware</td>
            <td class="hdv-value">${escapeHtml(a.ramHardwareReserved || '128 MB')}</td>
          </tr>

          <!-- 3. ALMACENAMIENTO Y CAPACIDAD DE DISCO -->
          <tr>
            <td colspan="4" class="hdv-section-header">3. ESPECIFICACIONES DE ALMACENAMIENTO (SSD / HDD)</td>
          </tr>
          <tr>
            <td class="hdv-label">Unidad de Disco Principal</td>
            <td class="hdv-value" style="font-weight: 700;">${escapeHtml(a.disk1Model || a.disk1Brand || 'SSD')}</td>
            <td class="hdv-label">Tipo / Interfaz</td>
            <td class="hdv-value">${escapeHtml(a.disk1Tech || "SSD SATA / NVMe")}</td>
          </tr>
          <tr>
            <td class="hdv-label">Capacidad Nominal</td>
            <td class="hdv-value" style="font-weight: 700;">${escapeHtml(a.disk1Capacity || '256 GB')} (Format: ${escapeHtml(a.diskFormatted || a.disk1Capacity || '')})</td>
            <td class="hdv-label">Uso de Almacenamiento</td>
            <td class="hdv-value">
              ${a.diskUsed ? `Usado: <strong>${escapeHtml(a.diskUsed)}</strong> | Libre: <strong style="color: #1b5e20;">${escapeHtml(a.diskFree)}</strong> (${escapeHtml(a.diskUsagePct || '')})` : 'Almacenamiento Integrado eMMC'}
            </td>
          </tr>
          ${a.disk2Capacity ? `
          <tr>
            <td class="hdv-label">Disco Secundario</td>
            <td colspan="3" class="hdv-value">${escapeHtml(a.disk2Brand)} ${escapeHtml(a.disk2Capacity)} (${escapeHtml(a.disk2Tech)}) - Serial: ${escapeHtml(a.disk2Serial || '-')}</td>
          </tr>
          ` : ''}

          <!-- 4. GRÁFICOS Y PANTALLA -->
          <tr>
            <td colspan="4" class="hdv-section-header">4. ESPECIFICACIONES GRÁFICAS Y PANTALLA</td>
          </tr>
          <tr>
            <td class="hdv-label">Controlador Gráfico (GPU)</td>
            <td class="hdv-value" style="font-weight: 700;">${escapeHtml(a.gpu || 'Intel Graphics')}</td>
            <td class="hdv-label">VRAM y Compartida</td>
            <td class="hdv-value">VRAM: ${escapeHtml(a.vramDedicated || '128 MB')} | Compartida: ${escapeHtml(a.gpuSharedMemory || '3.8 GB')}</td>
          </tr>
          <tr>
            <td class="hdv-label">Versión Driver / DirectX</td>
            <td class="hdv-value">${escapeHtml(a.gpuDriver || 'Intel Graphics Driver')}</td>
            <td class="hdv-label">Pantalla y Periféricos</td>
            <td class="hdv-value">${escapeHtml(a.monitorBrandModel || 'Integrada')} • ${escapeHtml(a.otherPeripherals || 'Cargador Original')}</td>
          </tr>

          <!-- 5. CONECTIVIDAD DE RED Y DIRECCIONAMIENTO -->
          <tr>
            <td colspan="4" class="hdv-section-header">5. CONECTIVIDAD DE RED Y COMUNICACIONES</td>
          </tr>
          <tr>
            <td class="hdv-label">Red Wi-Fi (SSID)</td>
            <td class="hdv-value" style="font-weight: 700; color: #1565c0;">📶 ${escapeHtml(a.wifiSSID || 'ALTINET FONDACIO')}</td>
            <td class="hdv-label">Dirección IPv4</td>
            <td class="hdv-value" style="font-family: monospace; font-weight: 800; color: #0f172a;">${escapeHtml(a.ip || 'DHCP')}</td>
          </tr>
          <tr>
            <td class="hdv-label">Adaptador de Red</td>
            <td class="hdv-value">${escapeHtml(a.networkCardBrand || 'Wi-Fi Dual Band')}</td>
            <td class="hdv-label">Dirección IPv6 / MAC</td>
            <td class="hdv-value" style="font-family: monospace; font-size: 0.72rem;">${escapeHtml(a.ipv6 || a.mac || 'N/A')}</td>
          </tr>

          <!-- 6. SISTEMA OPERATIVO, LICENCIA Y SEGURIDAD -->
          <tr>
            <td colspan="4" class="hdv-section-header">6. SISTEMA OPERATIVO, LICENCIAMIENTO Y SEGURIDAD</td>
          </tr>
          <tr>
            <td class="hdv-label">Sistema Operativo y Compilación</td>
            <td class="hdv-value" style="font-weight: 800; color: #0369a1;">💻 ${escapeHtml(a.os || 'Windows')}</td>
            <td class="hdv-label">Estado de Activación</td>
            <td class="hdv-value">
              ${a.licenseState === 'NO ACTIVADO' 
                ? '<span style="color: #dc2626; font-weight: 800; background: #fee2e2; padding: 2px 6px; border-radius: 4px;">⚠️ NO ACTIVADO</span>' 
                : '<span style="color: #16a34a; font-weight: 800; background: #dcfce7; padding: 2px 6px; border-radius: 4px;">✅ ACTIVADO</span>'}
              <span style="font-size: 0.75rem; color: #64748b; margin-left: 4px;">(${escapeHtml(a.licenseType || 'Digital')})</span>
            </td>
          </tr>
          <tr>
            <td class="hdv-label">Windows Update / Parches</td>
            <td class="hdv-value">${escapeHtml(a.windowsUpdateStatus || 'Actualizado')}</td>
            <td class="hdv-label">Antivirus / Seguridad</td>
            <td class="hdv-value">${escapeHtml(a.securityStatus || 'Microsoft Defender Activo')}</td>
          </tr>
          <tr>
            <td class="hdv-label">Optimización de Inicio</td>
            <td colspan="3" class="hdv-value">${escapeHtml(a.startupConfig || 'Procesos en segundo plano optimizados')}</td>
          </tr>
          <tr>
            <td class="hdv-label">Software Instalado</td>
            <td colspan="3" class="hdv-value" style="font-size: 0.78rem;">${escapeHtml(a.installedSoftware || 'Suite ofimática, navegadores y herramientas institucionales')}</td>
          </tr>

          <!-- 7. PLAN DE MANTENIMIENTO Y RECOMENDACIONES -->
          <tr>
            <td colspan="4" class="hdv-section-header">7. DIAGNÓSTICO, PLAN DE MANTENIMIENTO Y ACCIONES EJECUTADAS</td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 10px 12px; font-size: 0.84rem; background: ${a.status === 'mantenimiento' ? '#fff1f2' : '#f0fdf4'}; color: ${a.status === 'mantenimiento' ? '#9f1239' : '#14532d'}; border-bottom: 2px solid #334155;">
              ${a.status === 'mantenimiento' ? '⚠️' : '✅'} <strong>Acciones Ejecutadas / Recomendadas:</strong> ${escapeHtml(a.maintenanceAction || a.recommendations || 'Mantenimiento preventivo periódico recomendado.')}
              ${a.obsolescenceStrategy ? `<br>🌱 <strong>Estrategia de Mitigación de Obsolescencia:</strong> ${escapeHtml(a.obsolescenceStrategy)}` : ''}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Firmas Institucionales -->
      <div class="hdv-signature-area">
        <div style="border-top: 1px solid #334155; text-align: center; padding-top: 6px; font-size: 0.78rem;">
          <strong>Responsable Auditor / TIC</strong><br>
          <span>${escapeHtml(a.inventoriedBy || 'Equipo Técnico Fondacio')}</span><br>
          <span style="color: #64748b; font-size: 0.7rem;">Firma y Verificación Técnica</span>
        </div>
        <div style="border-top: 1px solid #334155; text-align: center; padding-top: 6px; font-size: 0.78rem;">
          <strong>Aceptación y Custodia Institucional</strong><br>
          <span>${escapeHtml(a.assignedTo || 'Responsable de Sede')}</span><br>
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

  const qrPayload = `FONDACIO COLOMBIA | ACTIVO: ${asset.code} | SERIAL: ${asset.serial || 'S/N'} | HOST: ${asset.networkHostname || asset.code} | SEDE: ${asset.sede}`;

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
  document.getElementById('qr-label-serial-text').textContent = `Host: ${asset.networkHostname || asset.code} | Serial: ${asset.serial || 'S/N'}`;

  openModal('modal-qr-tag');
}

function printCurrentQRTag() {
  window.print();
}

// --- EXPORTACIÓN EXCEL COMPLETA MULTI-HOJA SEGÚN ESTRUCTURA OFICIAL FONDACIO ---
function exportInventoryToExcel() {
  const assets = DB.getAssets();
  if (assets.length === 0) {
    showToast('No hay activos para exportar.', 'info');
    return;
  }

  // 1. Hoja: Censo General de Equipos
  const sheet1Data = assets.map(a => ({
    'ID Equipo': a.code,
    'Tipo Dispositivo': a.category === 'tablet' ? 'Tablet' : (a.computerType || 'Portátil'),
    'Marca / Fabricante': a.brand,
    'Modelo': a.model,
    'Nombre del Equipo': a.networkHostname || a.model,
    'Cuenta / Usuario': a.assignedTo,
    'Sistema Operativo': a.os,
    'Versión / Edición': a.osBuild || a.os,
    'Estado Licencia': a.licenseState || 'Activa',
    'Procesador (CPU)': a.processor,
    'RAM Instalada': a.ram,
    'Almacenamiento (Disco)': a.disk1Model || `${a.disk1Capacity} ${a.disk1Tech || ''}`,
    'Tarjeta Gráfica (GPU)': a.gpu || 'GPU Integrada',
    'Dirección IP (Red)': `${a.ip} (${a.wifiSSID || 'ALTINET FONDACIO'})`,
    'Estado Operativo / Mantenimiento': a.maintenanceAction || a.recommendations || 'Operativo'
  }));

  // 2. Hoja: Detalle Hardware PCs
  const pcsOnly = assets.filter(a => a.category !== 'tablet' && !a.code.startsWith('TAB'));
  const sheet2Data = pcsOnly.map(a => ({
    'ID Equipo': a.code,
    'Nombre Host': a.networkHostname,
    'Marca y Modelo': `${a.brand} ${a.model}`,
    'ID Dispositivo (UUID)': a.uuid || 'N/A',
    'ID del Producto': a.productId || a.serial,
    'Procesador (CPU)': a.processor,
    'Núcleos / Hilos': a.cpuCores || 'N/A',
    'Velocidad Base': a.cpuSpeed || 'N/A',
    'Caché CPU': a.cpuCache || 'N/A',
    'Virtualización': a.virtualization || 'Habilitada',
    'RAM Total': a.ram,
    'RAM Utilizable': a.ramUsable || a.ram,
    'Velocidad RAM': a.ramSpeed || 'N/A',
    'Ranuras RAM': a.ramSlots || 'N/A',
    'Tipo Módulo': a.ramType || 'SODIMM DDR4',
    'RAM Reservada Hardware': a.ramHardwareReserved || 'N/A',
    'Modelo Almacenamiento (SSD)': a.disk1Model || a.disk1Brand,
    'Tipo / Interfaz': a.disk1Tech,
    'Capacidad Nominal': a.disk1Capacity,
    'Capacidad Formateada': a.diskFormatted || a.disk1Capacity,
    'Espacio Usado': a.diskUsed || 'N/A',
    'Espacio Disponible': a.diskFree || 'N/A',
    '% Uso Disco': a.diskUsagePct || 'N/A',
    'Modelo Gráfico (GPU)': a.gpu,
    'VRAM Dedicada': a.vramDedicated || '128 MB',
    'Memoria GPU Compartida': a.gpuSharedMemory || 'N/A',
    'Versión Controlador': a.gpuDriver || 'N/A',
    'DirectX': a.directx || 'DirectX 12',
    'Tarjeta de Red Wi-Fi': a.networkCardBrand,
    'Red SSID': a.wifiSSID || 'ALTINET FONDACIO',
    'Dirección IPv4': a.ip,
    'Dirección IPv6': a.ipv6 || 'N/A'
  }));

  // 3. Hoja: Software y Mantenimiento
  const sheet3Data = pcsOnly.map(a => ({
    'ID Equipo': a.code,
    'Nombre Host': a.networkHostname,
    'Sistema Operativo': a.os,
    'Versión / Build': a.osBuild || '22H2',
    'Fecha Instalación': a.osInstallDate || a.purchaseDate,
    'Estado de Activación': a.licenseState || 'Activado',
    'Tipo de Licencia': a.licenseType || 'Licencia Digital',
    'Clave Parcial': a.licenseKeyPartial || 'Vinculada a Hardware',
    'Errores / Alertas de Licencia': a.licenseAlerts || 'Ninguno',
    'Estado Windows Update': a.windowsUpdateStatus || 'Al día en parches',
    'Antivirus / Seguridad': a.securityStatus || 'Microsoft Defender Activo',
    'Configuración de Inicio (Apps Desactivadas)': a.startupConfig || 'Optimizado',
    'Software y Herramientas Instaladas': a.installedSoftware || 'Ofimática y Utilidades',
    'Acciones de Mantenimiento Ejecutadas / Recomendadas': a.maintenanceAction || a.recommendations
  }));

  // 4. Hoja: Dispositivos Móviles (Tablets)
  const tabletsOnly = assets.filter(a => a.category === 'tablet' || a.code.startsWith('TAB'));
  const sheet4Data = tabletsOnly.map(a => ({
    'ID Dispositivo': a.code,
    'Nombre / Etiqueta': a.model,
    'Tipo': 'Tablet Educativa / Apoyo',
    'Sistema Operativo': a.os,
    'Versión Android': a.osBuild || '5.0 (Lollipop)',
    'Entorno de Trabajo': 'Nube / Colaborativo',
    'Cuenta Institucional Vinculada': 'Cuenta Institucional Google Fondacio',
    'Acceso a Google Drive': 'Acceso directo web en pantalla principal',
    'Estado de Obsolescencia': 'Obsolescencia por fin de ciclo Android 5.0',
    'Estrategia de Mitigación Aplicada': a.obsolescenceStrategy || 'Evasión de dependencias de Google Play mediante accesos web directos a Google Workspace (Drive, Docs, Sheets)',
    'Uso Destinado en Fondacio': a.recommendations || 'Talleres pedagógicos, lectura comunitaria, consulta web y actividades de aula de apoyo'
  }));

  if (typeof XLSX !== 'undefined') {
    const wb = XLSX.utils.book_new();

    // Sheet 1
    const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
    XLSX.utils.book_append_sheet(wb, ws1, 'Censo General de Equipos');

    // Sheet 2
    if (sheet2Data.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
      XLSX.utils.book_append_sheet(wb, ws2, 'Detalle Hardware PCs');
    }

    // Sheet 3
    if (sheet3Data.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(sheet3Data);
      XLSX.utils.book_append_sheet(wb, ws3, 'Software y Mantenimiento');
    }

    // Sheet 4
    if (sheet4Data.length > 0) {
      const ws4 = XLSX.utils.json_to_sheet(sheet4Data);
      XLSX.utils.book_append_sheet(wb, ws4, 'Dispositivos Móviles (Tablets)');
    }

    const fileName = `Inventario_Equipos_Fondacio_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast('Libro Excel completo con las 4 hojas exportado exitosamente.', 'success');
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
