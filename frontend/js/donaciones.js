/**
 * FONDACIO COLOMBIA - SISTEMA DE INVENTARIO
 * Módulo mínimo de Donaciones: muestra lo que hace el backend (/api/donaciones, /api/donantes,
 * /api/categorias). Lista con filtros y paginación, formulario, detalle con ítems, comprobante,
 * conversión de un ítem en equipo y exportación a Excel.
 */

const DONATIONS_PAGE_SIZE = 20;
const DONATION_FILTER_IDS = ['donation-filter-q', 'donation-filter-donor', 'donation-filter-sede',
  'donation-filter-category', 'donation-filter-status', 'donation-filter-from', 'donation-filter-to'];
const ITEM_CONDITIONS = { nuevo: 'Nuevo', usado: 'Usado', danado: 'Dañado' };
const NEW_CATEGORY_OPTION = '__nueva__';

let donationsOffset = 0;
let donationsTab = 'list';
let donationCatalogs = { donors: [], categories: [], sedes: [] };
let currentDonation = null; // Donación abierta en el detalle
let editingDonation = null; // Donación que se está editando (null al crear)
let donorFormFromDonation = false; // El donante se crea desde el formulario de donación
let donationItemRowCounter = 0;

function initDonacionesModule() {
  const debouncedReload = debounce(() => reloadDonations(), 300);
  document.getElementById('donation-filter-q')?.addEventListener('input', debouncedReload);
  DONATION_FILTER_IDS.filter(id => id !== 'donation-filter-q').forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => reloadDonations());
  });
  document.getElementById('donor-filter-q')?.addEventListener('input', debounce(() => renderDonorsTable(), 250));

  document.getElementById('form-donation')?.addEventListener('submit', handleSaveDonationForm);
  document.getElementById('form-donor')?.addEventListener('submit', handleSaveDonorForm);
  document.getElementById('form-donation-convert')?.addEventListener('submit', handleConvertItemForm);
  document.getElementById('form-category')?.addEventListener('submit', handleCreateCategoryForm);

  // Recalcula el total y muestra el campo de categoría nueva al cambiar un ítem.
  const itemsContainer = document.getElementById('donation-items-container');
  if (itemsContainer) {
    itemsContainer.addEventListener('input', updateDonationFormTotal);
    itemsContainer.addEventListener('change', (e) => {
      if (e.target.classList.contains('item-category')) {
        const row = e.target.closest('.donation-item-row');
        const nueva = row.querySelector('.item-new-category-group');
        nueva.style.display = e.target.value === NEW_CATEGORY_OPTION ? 'flex' : 'none';
        row.querySelector('.item-new-category').required = e.target.value === NEW_CATEGORY_OPTION;
      }
    });
  }
}

// --- UTILIDADES ---

function isDonationAdmin() {
  const user = DB.getCurrentUser();
  return !!user && user.role === 'admin';
}

// Hoy en la hora del navegador, en formato AAAA-MM-DD.
function todayIso() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "2026-11-10" -> "10/11/2026", sin pasar por Date para no correr el día por la zona horaria.
function formatDonationDate(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Igual que formatCurrencyCOP (inventory.js), pero un valor ausente se muestra como "—" y no como 0.
function formatPesos(value) {
  if (value === null || value === undefined || value === '') return '—';
  return formatCurrencyCOP(value);
}

function donationStatusPill(status) {
  return status === 'anulada'
    ? '<span class="status-pill status-baja">Anulada</span>'
    : '<span class="status-pill status-operativo">Recibida</span>';
}

function showFormError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message || '';
  el.style.display = message ? 'block' : 'none';
}

// --- CATÁLOGOS (donantes, categorías y sedes) ---

async function loadDonationCatalogs() {
  const [donors, categories, sedes] = await Promise.all([
    DB.getDonors(),
    DB.getCategories(),
    DB.getSedes()
  ]);
  donationCatalogs = { donors, categories, sedes };
  fillDonationFilterSelects();
}

function fillSelect(select, options, placeholder) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = (placeholder !== undefined ? `<option value="">${escapeHtml(placeholder)}</option>` : '') +
    options.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
  if (options.some(o => o.value === current)) select.value = current;
}

function fillDonationFilterSelects() {
  const { donors, categories, sedes } = donationCatalogs;
  fillSelect(document.getElementById('donation-filter-donor'),
    donors.map(d => ({ value: d.id, label: d.active ? d.name : `${d.name} (inactivo)` })), 'Todos los donantes');
  fillSelect(document.getElementById('donation-filter-sede'),
    sedes.map(s => ({ value: s.name, label: s.name })), 'Todas las sedes');
  fillSelect(document.getElementById('donation-filter-category'),
    categories.map(c => ({ value: c.id, label: c.active ? c.name : `${c.name} (inactiva)` })), 'Todas las categorías');
}

async function renderDonationsMonthSummary() {
  const badge = document.getElementById('donations-month-summary');
  if (!badge) return;
  try {
    const stats = await DB.getDashboardStats();
    badge.textContent = `Este mes: ${stats.donationsThisMonth} donaciones · ${stats.itemsReceivedThisMonth} ítems recibidos`;
  } catch (e) {
    badge.textContent = 'Este mes: -';
  }
}

// --- VISTA Y PESTAÑAS ---

async function renderDonacionesView() {
  try {
    await loadDonationCatalogs();
  } catch (err) {
    showToast('Error al cargar los catálogos de donaciones: ' + err.message, 'error');
  }
  renderDonationsMonthSummary();
  showDonationsTab(donationsTab);
}

function showDonationsTab(tab) {
  donationsTab = tab;
  document.querySelectorAll('.donation-tab-btn').forEach(btn => {
    const active = btn.getAttribute('data-tab') === tab;
    btn.classList.toggle('active', active);
    btn.classList.toggle('btn-primary', active);
    btn.classList.toggle('btn-secondary', !active);
  });
  document.getElementById('donations-tab-list').style.display = tab === 'list' ? 'block' : 'none';
  document.getElementById('donations-tab-donors').style.display = tab === 'donors' ? 'block' : 'none';
  document.getElementById('donations-tab-categories').style.display = tab === 'categories' ? 'block' : 'none';

  if (tab === 'list') loadDonations();
  else if (tab === 'donors') renderDonorsTable();
  else renderCategoriesTable();
}

// --- LISTA DE DONACIONES ---

function getDonationFilters() {
  const val = id => document.getElementById(id)?.value || '';
  return {
    desde: val('donation-filter-from'),
    hasta: val('donation-filter-to'),
    donante: val('donation-filter-donor'),
    sede: val('donation-filter-sede'),
    estado: val('donation-filter-status'),
    categoria: val('donation-filter-category'),
    q: val('donation-filter-q')
  };
}

function reloadDonations() {
  donationsOffset = 0;
  loadDonations();
}

function changeDonationsPage(delta) {
  donationsOffset = Math.max(0, donationsOffset + delta * DONATIONS_PAGE_SIZE);
  loadDonations();
}

function resetDonationFilters() {
  DONATION_FILTER_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  reloadDonations();
}

async function loadDonations() {
  const tbody = document.getElementById('donations-table-body');
  if (!tbody) return;

  let page;
  try {
    page = await DB.getDonations(getDonationFilters(), DONATIONS_PAGE_SIZE, donationsOffset);
  } catch (err) {
    showToast('Error al cargar donaciones: ' + err.message, 'error');
    return;
  }

  const { items, total } = page;
  document.getElementById('donations-count-badge').textContent = `${total} donaciones`;
  document.getElementById('donations-table-wrap').style.display = items.length ? 'block' : 'none';
  document.getElementById('donations-empty-state').style.display = items.length ? 'none' : 'flex';

  const desde = total === 0 ? 0 : donationsOffset + 1;
  const hasta = donationsOffset + items.length;
  document.getElementById('donations-page-info').textContent = `Mostrando ${desde}–${hasta} de ${total}`;
  document.getElementById('donations-prev-btn').disabled = donationsOffset === 0;
  document.getElementById('donations-next-btn').disabled = hasta >= total;

  tbody.innerHTML = items.map(d => {
    const units = d.items.reduce((sum, i) => sum + i.quantity, 0);
    const names = d.items.slice(0, 3).map(i => i.name).join(', ') + (d.items.length > 3 ? '…' : '');
    return `
      <tr>
        <td>${formatDonationDate(d.donationDate)}</td>
        <td><strong>${escapeHtml(d.donorName)}</strong></td>
        <td>${escapeHtml(d.sede)}</td>
        <td>
          ${d.items.length} ítem(s) · ${units} unid.
          <div style="font-size: 0.75rem; color: var(--text-secondary);">${escapeHtml(names)}</div>
        </td>
        <td><strong>${formatPesos(d.totalEstimated)}</strong></td>
        <td>
          ${donationStatusPill(d.status)}
          ${d.receipt ? '<i data-lucide="paperclip" title="Tiene comprobante" style="width: 14px; height: 14px; vertical-align: middle;"></i>' : ''}
        </td>
        <td style="text-align: right;">
          <div class="action-btns-group" style="justify-content: flex-end;">
            <button class="icon-button" onclick="viewDonationDetail('${escapeHtml(d.id)}')" title="Ver detalle">
              <i data-lucide="eye"></i>
            </button>
            ${d.status === 'recibida' ? `
              <button class="icon-button admin-only" data-admin-only onclick="openEditDonationModal('${escapeHtml(d.id)}')" title="Editar">
                <i data-lucide="edit-3"></i>
              </button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function exportDonationsToExcel() {
  const qs = DB.donationFilterParams(getDonationFilters()).toString();
  window.location.href = `/api/donaciones/export.xlsx${qs ? '?' + qs : ''}`;
  showToast('Descargando el Excel de donaciones con los filtros activos...', 'info');
}

// --- DETALLE ---

async function viewDonationDetail(id) {
  try {
    currentDonation = await DB.getDonationById(id);
    renderDonationDetail();
    openModal('modal-donation-detail');
  } catch (err) {
    showToast('Error al cargar la donación: ' + err.message, 'error');
  }
}

function renderDonationDetail() {
  const d = currentDonation;
  const content = document.getElementById('donation-detail-content');
  const footer = document.getElementById('donation-detail-footer');
  if (!d || !content || !footer) return;

  const editable = d.status === 'recibida';
  const field = (label, value) => `
    <div>
      <div style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">${label}</div>
      <div style="font-size: 0.9rem; color: var(--text-main);">${value}</div>
    </div>`;

  const itemsRows = d.items.map(item => {
    let assetCell = '<span style="color: var(--text-secondary);">—</span>';
    if (item.assetId) {
      assetCell = `<button class="btn btn-sm btn-secondary" onclick="openAssetFromDonation('${escapeHtml(item.assetId)}')">
        <i data-lucide="monitor"></i> Ver equipo</button>`;
    } else if (editable && item.quantity === 1) {
      assetCell = `<button class="btn btn-sm btn-primary admin-only" data-admin-only onclick="openConvertItemModal('${escapeHtml(item.id)}')">
        <i data-lucide="monitor"></i> Convertir en equipo</button>`;
    } else if (editable) {
      assetCell = '<span class="admin-only" data-admin-only style="font-size: 0.72rem; color: var(--text-secondary);">Solo ítems de cantidad 1</span>';
    }
    const subtotal = item.estimatedUnitValue === null ? null : item.quantity * item.estimatedUnitValue;
    return `
      <tr>
        <td>
          <strong>${escapeHtml(item.name)}</strong>
          ${item.description ? `<div style="font-size: 0.75rem; color: var(--text-secondary);">${escapeHtml(item.description)}</div>` : ''}
        </td>
        <td>${escapeHtml(item.categoryName || 'Sin categoría')}</td>
        <td>${item.quantity}</td>
        <td>${ITEM_CONDITIONS[item.condition] || escapeHtml(item.condition)}</td>
        <td>${formatPesos(item.estimatedUnitValue)}</td>
        <td>${formatPesos(subtotal)}</td>
        <td style="text-align: right;">${assetCell}</td>
      </tr>`;
  }).join('');

  const receiptBlock = d.receipt
    ? `<a href="${escapeHtml(d.receipt)}" target="_blank" rel="noopener" title="Abrir el comprobante">
         <img src="${escapeHtml(d.receipt)}" alt="Comprobante de la donación" style="max-height: 260px; max-width: 100%; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);" />
       </a>`
    : '<p style="font-size: 0.85rem; color: var(--text-secondary);">Sin comprobante.</p>';

  const receiptActions = editable ? `
    <div class="admin-only" data-admin-only style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-top: 0.75rem;">
      <input type="file" id="donation-receipt-file" accept="image/jpeg,image/png,image/webp" class="form-control" style="max-width: 320px;" />
      <button class="btn btn-sm btn-primary" onclick="uploadReceiptFromDetail()">
        <i data-lucide="upload"></i> ${d.receipt ? 'Reemplazar' : 'Subir'} comprobante
      </button>
      ${d.receipt ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteReceiptFromDetail()">
        <i data-lucide="trash-2"></i> Quitar</button>` : ''}
    </div>` : '';

  content.innerHTML = `
    ${editable ? '' : `
      <div class="form-error-banner">
        Donación anulada: es de solo lectura.
      </div>`}
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
      ${field('Donante', escapeHtml(d.donorName))}
      ${field('Sede destino', escapeHtml(d.sede))}
      ${field('Fecha', formatDonationDate(d.donationDate))}
      ${field('Estado', donationStatusPill(d.status))}
      ${field('Total estimado', `<strong>${formatPesos(d.totalEstimated)}</strong>`)}
    </div>
    ${d.notes ? `<p style="font-size: 0.85rem; margin-bottom: 1.25rem;"><strong>Notas:</strong> ${escapeHtml(d.notes)}</p>` : ''}

    <div class="form-section-banner" style="margin-bottom: 0.5rem;">Ítems recibidos</div>
    <div class="table-responsive" style="margin-bottom: 1.25rem;">
      <table class="custom-table">
        <thead>
          <tr>
            <th>Ítem</th><th>Categoría</th><th>Cant.</th><th>Estado</th>
            <th>Valor unit.</th><th>Subtotal</th><th style="text-align: right;">Equipo</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>
    </div>

    <div class="form-section-banner" style="margin-bottom: 0.5rem;">Comprobante</div>
    ${receiptBlock}
    ${receiptActions}
  `;

  footer.innerHTML = `
    ${editable ? `
      <button class="btn btn-outline-danger admin-only" data-admin-only onclick="voidDonationFromDetail()">
        <i data-lucide="ban"></i> Anular
      </button>
      <button class="btn btn-secondary admin-only" data-admin-only onclick="openEditDonationModal('${escapeHtml(d.id)}')">
        <i data-lucide="edit-3"></i> Editar
      </button>` : ''}
    <button class="btn btn-secondary" onclick="closeModal('modal-donation-detail')">Cerrar</button>
  `;

  if (window.lucide) lucide.createIcons();
}

// Tras un cambio: vuelve a pedir la donación, refresca el detalle, la lista y el resumen del mes.
async function refreshAfterDonationChange(donationId) {
  if (donationId) {
    currentDonation = await DB.getDonationById(donationId);
    renderDonationDetail();
  }
  loadDonations();
  renderDonationsMonthSummary();
}

function openAssetFromDonation(assetId) {
  closeModal('modal-donation-detail');
  viewHojaDeVida(assetId);
}

async function uploadReceiptFromDetail() {
  const input = document.getElementById('donation-receipt-file');
  const file = input && input.files && input.files[0];
  if (!file) {
    showToast('Elige una imagen JPEG, PNG o WebP.', 'warning');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('La imagen supera los 10 MB permitidos.', 'error');
    return;
  }
  try {
    currentDonation = await DB.uploadDonationReceipt(currentDonation.id, file);
    showToast('Comprobante guardado.', 'success');
    renderDonationDetail();
    loadDonations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteReceiptFromDetail() {
  if (!confirm('¿Quitar el comprobante de esta donación?')) return;
  try {
    await DB.deleteDonationReceipt(currentDonation.id);
    showToast('Comprobante eliminado.', 'info');
    await refreshAfterDonationChange(currentDonation.id);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function voidDonationFromDetail() {
  if (!confirm('¿Anular esta donación? Quedará de solo lectura y no se podrá revertir.')) return;
  try {
    currentDonation = await DB.voidDonation(currentDonation.id);
    showToast('Donación anulada.', 'info');
    renderDonationDetail();
    loadDonations();
    renderDonationsMonthSummary();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- CONVERTIR UN ÍTEM EN EQUIPO ---

function openConvertItemModal(itemId) {
  const item = currentDonation && currentDonation.items.find(i => i.id === itemId);
  if (!item) return;
  document.getElementById('form-donation-convert').reset();
  showFormError('convert-form-error', '');
  document.getElementById('convert-donation-id').value = currentDonation.id;
  document.getElementById('convert-item-id').value = item.id;
  document.getElementById('convert-value').value = item.estimatedUnitValue ?? '';
  document.getElementById('convert-item-summary').textContent =
    `Ítem: ${item.name} (${item.categoryName || 'Sin categoría'}). Se creará un equipo en ${currentDonation.sede} y el ítem quedará bloqueado.`;
  openModal('modal-donation-convert');
}

async function handleConvertItemForm(e) {
  e.preventDefault();
  const donationId = document.getElementById('convert-donation-id').value;
  const itemId = document.getElementById('convert-item-id').value;
  const value = document.getElementById('convert-value').value;
  const payload = {
    code: document.getElementById('convert-code').value.trim(),
    computerType: document.getElementById('convert-type').value,
    brand: document.getElementById('convert-brand').value.trim(),
    model: document.getElementById('convert-model').value.trim(),
    serial: document.getElementById('convert-serial').value.trim(),
    status: document.getElementById('convert-status').value,
    estimatedValue: value === '' ? null : Number(value)
  };
  try {
    const asset = await DB.convertDonationItem(donationId, itemId, payload);
    closeModal('modal-donation-convert');
    showToast(`Equipo ${asset.code} creado en el inventario.`, 'success');
    await refreshAfterDonationChange(donationId);
  } catch (err) {
    showFormError('convert-form-error', err.message);
    showToast(err.message, 'error');
  }
}

// --- FORMULARIO DE DONACIÓN ---

function fillDonationFormSelects(current = {}) {
  const { donors, sedes } = donationCatalogs;
  // Solo donantes activos, salvo el que ya tiene la donación que se edita.
  const donorOptions = donors
    .filter(d => d.active || d.id === current.donorId)
    .map(d => ({ value: d.id, label: d.active ? d.name : `${d.name} (inactivo)` }));
  fillSelect(document.getElementById('donation-donor'), donorOptions, 'Selecciona un donante');
  fillSelect(document.getElementById('donation-sede'), sedes.map(s => ({ value: s.name, label: s.name })));
  if (current.donorId !== undefined) document.getElementById('donation-donor').value = current.donorId;
  if (current.sede !== undefined) document.getElementById('donation-sede').value = current.sede;
}

async function openNewDonationModal() {
  if (!isDonationAdmin()) return;
  try {
    await loadDonationCatalogs();
  } catch (err) {
    showToast(err.message, 'error');
    return;
  }
  editingDonation = null;
  document.getElementById('form-donation').reset();
  showFormError('donation-form-error', '');
  document.getElementById('modal-donation-title').textContent = 'Registrar Donación';
  document.getElementById('donation-id').value = '';
  fillDonationFormSelects({ donorId: '' });
  const date = document.getElementById('donation-date');
  date.max = todayIso();
  date.value = todayIso();
  document.getElementById('donation-items-container').innerHTML = '';
  addDonationItemRow();
  updateDonationFormTotal();
  openModal('modal-donation-form');
}

async function openEditDonationModal(id) {
  if (!isDonationAdmin()) return;
  let donation;
  try {
    [donation] = await Promise.all([DB.getDonationById(id), loadDonationCatalogs()]);
  } catch (err) {
    showToast(err.message, 'error');
    return;
  }
  if (donation.status !== 'recibida') {
    showToast('La donación está anulada y no se puede modificar.', 'warning');
    return;
  }
  editingDonation = donation;
  closeModal('modal-donation-detail');
  document.getElementById('form-donation').reset();
  showFormError('donation-form-error', '');
  document.getElementById('modal-donation-title').textContent = `Editar Donación de ${donation.donorName}`;
  document.getElementById('donation-id').value = donation.id;
  fillDonationFormSelects({ donorId: donation.donorId, sede: donation.sede });
  const date = document.getElementById('donation-date');
  date.max = todayIso();
  date.value = donation.donationDate;
  document.getElementById('donation-notes').value = donation.notes || '';
  document.getElementById('donation-items-container').innerHTML = '';
  donation.items.forEach(item => addDonationItemRow(item));
  updateDonationFormTotal();
  openModal('modal-donation-form');
}

function categoryOptionsHtml(selectedId) {
  // Las inactivas no se ofrecen, salvo la que ya tiene el ítem.
  const options = donationCatalogs.categories
    .filter(c => c.active || c.id === selectedId)
    .map(c => `<option value="${escapeHtml(c.id)}" ${c.id === selectedId ? 'selected' : ''}>${escapeHtml(c.name)}${c.active ? '' : ' (inactiva)'}</option>`)
    .join('');
  return `<option value="">Sin categoría</option>${options}<option value="${NEW_CATEGORY_OPTION}">+ Nueva categoría…</option>`;
}

function addDonationItemRow(item = null) {
  const container = document.getElementById('donation-items-container');
  if (!container) return;
  const n = ++donationItemRowCounter;
  const locked = !!(item && item.assetId);
  const dis = locked ? 'disabled' : '';
  const conditionOptions = Object.entries(ITEM_CONDITIONS)
    .map(([value, label]) => `<option value="${value}" ${item && item.condition === value ? 'selected' : ''}>${label}</option>`)
    .join('');

  const row = document.createElement('div');
  row.className = 'form-subpanel donation-item-row';
  if (item) row.dataset.itemId = item.id;
  if (locked) row.dataset.locked = 'true';
  row.innerHTML = `
    <div class="form-subpanel-title" style="justify-content: space-between;">
      <span>Ítem ${locked ? '· convertido en equipo: no se puede modificar ni quitar' : ''}</span>
      ${locked ? '' : `<button type="button" class="icon-button" title="Quitar ítem" onclick="removeDonationItemRow(this)" style="color: var(--accent-rose);">
        <i data-lucide="trash-2"></i></button>`}
    </div>
    <div class="form-grid-3">
      <div class="form-group col-span-2">
        <label for="item-name-${n}">Nombre <span class="required">*</span></label>
        <input type="text" id="item-name-${n}" class="form-control item-name" required maxlength="300" placeholder="Ej: Sillas plásticas" value="${escapeHtml(item ? item.name : '')}" ${dis} />
      </div>
      <div class="form-group">
        <label for="item-qty-${n}">Cantidad <span class="required">*</span></label>
        <input type="number" id="item-qty-${n}" class="form-control item-quantity" required min="1" max="1000000" step="1" value="${item ? item.quantity : 1}" ${dis} />
      </div>
      <div class="form-group">
        <label for="item-cat-${n}">Categoría</label>
        <select id="item-cat-${n}" class="form-control item-category" ${dis}>${categoryOptionsHtml(item ? item.categoryId : '')}</select>
      </div>
      <div class="form-group item-new-category-group" style="display: none;">
        <label for="item-newcat-${n}">Nueva categoría <span class="required">*</span></label>
        <input type="text" id="item-newcat-${n}" class="form-control item-new-category" maxlength="300" placeholder="Se crea al guardar" />
      </div>
      <div class="form-group">
        <label for="item-cond-${n}">Estado</label>
        <select id="item-cond-${n}" class="form-control item-condition" ${dis}>${conditionOptions}</select>
      </div>
      <div class="form-group">
        <label for="item-value-${n}">Valor unitario estimado (COP)</label>
        <input type="number" id="item-value-${n}" class="form-control item-value" min="0" step="1" placeholder="Opcional" value="${item && item.estimatedUnitValue !== null ? item.estimatedUnitValue : ''}" ${dis} />
      </div>
      <div class="form-group col-span-3">
        <label for="item-desc-${n}">Descripción</label>
        <input type="text" id="item-desc-${n}" class="form-control item-description" maxlength="5000" value="${escapeHtml(item ? item.description : '')}" ${dis} />
      </div>
    </div>
  `;
  container.appendChild(row);
  if (window.lucide) lucide.createIcons();
  updateDonationFormTotal();
}

function removeDonationItemRow(button) {
  button.closest('.donation-item-row')?.remove();
  updateDonationFormTotal();
}

function updateDonationFormTotal() {
  let total = 0;
  document.querySelectorAll('#donation-items-container .donation-item-row').forEach(row => {
    const qty = parseInt(row.querySelector('.item-quantity').value, 10) || 0;
    const value = Number(row.querySelector('.item-value').value) || 0;
    total += qty * value;
  });
  const el = document.getElementById('donation-form-total');
  if (el) el.textContent = formatPesos(total);
}

function collectDonationItems() {
  const rows = document.querySelectorAll('#donation-items-container .donation-item-row');
  return Array.from(rows).map(row => {
    const id = row.dataset.itemId;
    if (row.dataset.locked) {
      // Un ítem convertido se reenvía con su id y sin cambios; si no, el servidor responde 409.
      const original = editingDonation.items.find(i => i.id === id);
      return {
        id,
        name: original.name,
        categoryId: original.categoryId || '',
        quantity: original.quantity,
        condition: original.condition,
        estimatedUnitValue: original.estimatedUnitValue,
        description: original.description
      };
    }
    const category = row.querySelector('.item-category').value;
    const value = row.querySelector('.item-value').value;
    const item = {
      name: row.querySelector('.item-name').value.trim(),
      quantity: parseInt(row.querySelector('.item-quantity').value, 10),
      condition: row.querySelector('.item-condition').value,
      estimatedUnitValue: value === '' ? null : Number(value),
      description: row.querySelector('.item-description').value.trim()
    };
    if (category === NEW_CATEGORY_OPTION) item.newCategory = row.querySelector('.item-new-category').value.trim();
    else item.categoryId = category;
    // Solo al editar: con id se actualiza el ítem existente, sin id se crea uno nuevo.
    if (id) item.id = id;
    return item;
  });
}

async function handleSaveDonationForm(e) {
  e.preventDefault();
  showFormError('donation-form-error', '');
  const items = collectDonationItems();
  if (items.length === 0) {
    showFormError('donation-form-error', 'La donación debe tener al menos un ítem.');
    return;
  }

  const payload = {
    donorId: document.getElementById('donation-donor').value,
    sede: document.getElementById('donation-sede').value,
    donationDate: document.getElementById('donation-date').value,
    notes: document.getElementById('donation-notes').value.trim(),
    items
  };

  const button = document.getElementById('btn-save-donation');
  button.disabled = true;
  try {
    const saved = editingDonation
      ? await DB.updateDonation(editingDonation.id, payload)
      : await DB.createDonation(payload);
    closeModal('modal-donation-form');
    showToast(editingDonation ? 'Donación actualizada.' : 'Donación registrada.', 'success');
    editingDonation = null;
    // Puede haber categorías nuevas: se recargan los catálogos antes de mostrar el resultado.
    await loadDonationCatalogs();
    loadDonations();
    renderDonationsMonthSummary();
    await viewDonationDetail(saved.id);
  } catch (err) {
    showFormError('donation-form-error', err.message);
    showToast(err.message, 'error');
  } finally {
    button.disabled = false;
  }
}

// --- DONANTES ---

async function renderDonorsTable() {
  const tbody = document.getElementById('donors-table-body');
  if (!tbody) return;
  const q = (document.getElementById('donor-filter-q')?.value || '').trim().toLowerCase();
  try {
    donationCatalogs.donors = await DB.getDonors();
  } catch (err) {
    showToast('Error al cargar donantes: ' + err.message, 'error');
    return;
  }
  const donors = donationCatalogs.donors.filter(d =>
    !q || d.name.toLowerCase().includes(q) || (d.contact || '').toLowerCase().includes(q));

  if (donors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 1.5rem;">No hay donantes registrados.</td></tr>';
    return;
  }
  tbody.innerHTML = donors.map(d => `
    <tr>
      <td><strong>${escapeHtml(d.name)}</strong>${d.notes ? `<div style="font-size: 0.75rem; color: var(--text-secondary);">${escapeHtml(d.notes)}</div>` : ''}</td>
      <td>${d.type === 'empresa' ? 'Empresa' : 'Persona'}</td>
      <td>${escapeHtml(d.contact || '-')}</td>
      <td>${d.active ? '<span class="status-pill status-operativo">Activo</span>' : '<span class="status-pill status-baja">Inactivo</span>'}</td>
      <td style="text-align: right;">
        <div class="action-btns-group" style="justify-content: flex-end;">
          <button class="btn btn-sm btn-secondary" onclick="showDonorHistory('${escapeHtml(d.id)}')">Ver donaciones</button>
          <button class="icon-button admin-only" data-admin-only onclick="openDonorModal('${escapeHtml(d.id)}')" title="Editar">
            <i data-lucide="edit-3"></i>
          </button>
          <button class="btn btn-sm ${d.active ? 'btn-outline-danger' : 'btn-secondary'} admin-only" data-admin-only onclick="toggleDonorActive('${escapeHtml(d.id)}')">
            ${d.active ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

// El historial de un donante es la lista de donaciones filtrada por él.
function showDonorHistory(donorId) {
  resetDonationFiltersSilently();
  document.getElementById('donation-filter-donor').value = donorId;
  donationsOffset = 0;
  showDonationsTab('list');
}

function resetDonationFiltersSilently() {
  // Se conserva el filtro de donante, que el llamador acaba de fijar.
  DONATION_FILTER_IDS.filter(id => id !== 'donation-filter-donor').forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function openDonorModal(id = null, fromDonationForm = false) {
  donorFormFromDonation = fromDonationForm;
  const donor = id ? donationCatalogs.donors.find(d => d.id === id) : null;
  document.getElementById('form-donor').reset();
  showFormError('donor-form-error', '');
  document.getElementById('modal-donor-title').textContent = donor ? `Editar Donante: ${donor.name}` : 'Registrar Donante';
  document.getElementById('donor-id').value = donor ? donor.id : '';
  document.getElementById('donor-name').value = donor ? donor.name : '';
  document.getElementById('donor-type').value = donor ? donor.type : 'persona';
  document.getElementById('donor-active').value = donor ? String(donor.active) : 'true';
  document.getElementById('donor-contact').value = donor ? donor.contact : '';
  document.getElementById('donor-notes').value = donor ? donor.notes : '';
  openModal('modal-donor-form');
}

async function handleSaveDonorForm(e) {
  e.preventDefault();
  const id = document.getElementById('donor-id').value;
  const donor = {
    id: id || undefined,
    name: document.getElementById('donor-name').value.trim(),
    type: document.getElementById('donor-type').value,
    active: document.getElementById('donor-active').value === 'true',
    contact: document.getElementById('donor-contact').value.trim(),
    notes: document.getElementById('donor-notes').value.trim()
  };
  try {
    const saved = await DB.saveDonor(donor);
    closeModal('modal-donor-form');
    showToast(id ? 'Donante actualizado.' : 'Donante registrado.', 'success');
    donationCatalogs.donors = await DB.getDonors();
    fillDonationFilterSelects();
    if (donorFormFromDonation) {
      const current = editingDonation ? editingDonation.donorId : undefined;
      fillDonationFormSelects({ donorId: current });
      if (saved.active) document.getElementById('donation-donor').value = saved.id;
    }
    if (donationsTab === 'donors') renderDonorsTable();
  } catch (err) {
    showFormError('donor-form-error', err.message);
    showToast(err.message, 'error');
  }
}

async function toggleDonorActive(id) {
  const donor = donationCatalogs.donors.find(d => d.id === id);
  if (!donor) return;
  try {
    await DB.saveDonor({ ...donor, active: !donor.active });
    showToast(`Donante ${donor.active ? 'desactivado' : 'activado'}.`, 'info');
    await renderDonorsTable();
    fillDonationFilterSelects();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- CATEGORÍAS ---

async function renderCategoriesTable() {
  const tbody = document.getElementById('categories-table-body');
  if (!tbody) return;
  try {
    donationCatalogs.categories = await DB.getCategories();
  } catch (err) {
    showToast('Error al cargar categorías: ' + err.message, 'error');
    return;
  }
  fillDonationFilterSelects();
  const categories = donationCatalogs.categories;
  if (categories.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 1.5rem;">No hay categorías.</td></tr>';
    return;
  }
  tbody.innerHTML = categories.map(c => `
    <tr>
      <td><strong>${escapeHtml(c.name)}</strong></td>
      <td>${c.active ? '<span class="status-pill status-operativo">Activa</span>' : '<span class="status-pill status-baja">Inactiva</span>'}</td>
      <td style="text-align: right;">
        <div class="action-btns-group admin-only" data-admin-only style="justify-content: flex-end;">
          <button class="icon-button" onclick="renameCategory('${escapeHtml(c.id)}')" title="Renombrar">
            <i data-lucide="edit-3"></i>
          </button>
          <button class="btn btn-sm btn-secondary" onclick="toggleCategoryActive('${escapeHtml(c.id)}')">
            ${c.active ? 'Desactivar' : 'Activar'}
          </button>
          <button class="icon-button" onclick="deleteCategory('${escapeHtml(c.id)}')" title="Borrar" style="color: var(--accent-rose);">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

async function handleCreateCategoryForm(e) {
  e.preventDefault();
  const input = document.getElementById('category-new-name');
  try {
    await DB.createCategory(input.value.trim());
    input.value = '';
    showToast('Categoría creada.', 'success');
    renderCategoriesTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function renameCategory(id) {
  const category = donationCatalogs.categories.find(c => c.id === id);
  if (!category) return;
  const name = prompt('Nuevo nombre de la categoría:', category.name);
  if (name === null || !name.trim() || name.trim() === category.name) return;
  try {
    await DB.updateCategory(id, { name: name.trim() });
    showToast('Categoría renombrada.', 'success');
    renderCategoriesTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleCategoryActive(id) {
  const category = donationCatalogs.categories.find(c => c.id === id);
  if (!category) return;
  try {
    await DB.updateCategory(id, { active: !category.active });
    showToast(`Categoría ${category.active ? 'desactivada: ya no se ofrece en formularios nuevos' : 'activada'}.`, 'info');
    renderCategoriesTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCategory(id) {
  const category = donationCatalogs.categories.find(c => c.id === id);
  if (!category) return;
  if (!confirm(`¿Borrar la categoría "${category.name}"? Sus ítems quedarán como "Sin categoría". Para dejar de ofrecerla basta con desactivarla.`)) return;
  try {
    await DB.deleteCategory(id);
    showToast('Categoría borrada.', 'info');
    renderCategoriesTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
