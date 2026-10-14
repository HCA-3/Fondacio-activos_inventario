/**
 * FONDACIO COLOMBIA - SISTEMA DE GESTIÓN DE ACTIVOS DE HARDWARE
 * Capa de Comunicación con la API REST de FastAPI
 * Reemplaza la persistencia en LocalStorage según GUIA-MIGRACION-FRONTEND.md
 */

let currentUser = null;

// Presets por defecto de tema en caso de que la configuración aún no esté en el servidor
const DEFAULT_THEME_CONFIG = {
  preset: 'fondacio-green',
  mode: 'light',
  primaryColor: '#2e7d32',
  primaryDark: '#1b5e20',
  primaryLight: '#e8f5e9',
  secondaryColor: '#1565c0',
  sidebarBg: '#0f2d18',
  appBg: '#f4f7f6',
  accentColor: '#f59e0b'
};

const DEFAULT_SETTINGS = {
  orgName: 'Fundación Fondacio Colombia',
  nit: '900.384.129-5',
  email: 'contacto@fondacio-co.org',
  website: 'https://www.fondaciocolombia.org'
};

/**
 * Función central de cliente API
 * Maneja cabeceras, JSON, 401 (sesión vencida), 204 y extracción de errores de negocio.
 */
async function api(ruta, { method = 'GET', body } = {}) {
  const options = {
    method,
    headers: {}
  };

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const res = await fetch(ruta, options);

  if (res.status === 401 && ruta !== '/api/auth/login') {
    if (typeof mostrarLogin === 'function') {
      mostrarLogin();
    }
    throw new Error('Sesión vencida o no iniciada');
  }

  if (res.status === 204) {
    return null;
  }

  let datos;
  try {
    datos = await res.json();
  } catch (e) {
    if (!res.ok) throw new Error(`Error en servidor (${res.status})`);
    return null;
  }

  if (!res.ok) {
    const detalle = Array.isArray(datos.detail)
      ? datos.detail.map(e => e.msg || JSON.stringify(e)).join('. ')
      : datos.detail || 'Ocurrió un error inesperado';
    throw new Error(detalle);
  }

  return datos;
}

class DataStoreAPI {
  constructor() {
    this.user = null;
    this.cachedSedes = [];
  }

  getCurrentUser() {
    return this.user;
  }

  setCurrentUser(u) {
    this.user = u;
    currentUser = u;
  }

  // --- SESIÓN Y AUTENTICACIÓN ---
  async getMe() {
    const user = await api('/api/auth/me');
    this.setCurrentUser(user);
    return user;
  }

  async login(username, password) {
    const user = await api('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    });
    this.setCurrentUser(user);
    return user;
  }

  async logout() {
    await api('/api/auth/logout', { method: 'POST' });
    this.setCurrentUser(null);
  }

  async changePassword(newPassword) {
    return await api('/api/auth/contrasena', {
      method: 'POST',
      body: { password: newPassword }
    });
  }

  // --- GESTIÓN DE USUARIOS (SOLO ADMIN) ---
  async getUsers(limit = 100, offset = 0) {
    return await api(`/api/usuarios?limit=${limit}&offset=${offset}`);
  }

  async createUser(userData) {
    return await api('/api/usuarios', {
      method: 'POST',
      body: userData
    });
  }

  async updateUser(id, updates) {
    return await api(`/api/usuarios/${id}`, {
      method: 'PATCH',
      body: updates
    });
  }

  async resetUserPassword(id, password) {
    return await api(`/api/usuarios/${id}/contrasena`, {
      method: 'POST',
      body: { password }
    });
  }

  // --- SEDES ---
  async getSedes() {
    const res = await api('/api/sedes?limit=500');
    this.cachedSedes = res.items || [];
    return this.cachedSedes;
  }

  async getSedeById(id) {
    return await api(`/api/sedes/${id}`);
  }

  async getSedeByName(name) {
    if (!name) return null;
    if (!this.cachedSedes || this.cachedSedes.length === 0) {
      await this.getSedes();
    }
    return this.cachedSedes.find(s => s.name.toLowerCase() === name.toLowerCase()) || null;
  }

  async saveSede(sede) {
    const payload = {
      name: sede.name,
      fullName: sede.fullName || '',
      code: sede.code || '',
      address: sede.address || '',
      city: sede.city || '',
      phone: sede.phone || '',
      email: sede.email || '',
      color: sede.color || '#2e7d32',
      focus: sede.focus || ''
    };

    if (sede.id) {
      return await api(`/api/sedes/${sede.id}`, {
        method: 'PATCH',
        body: payload
      });
    } else {
      return await api('/api/sedes', {
        method: 'POST',
        body: payload
      });
    }
  }

  async deleteSede(id) {
    await api(`/api/sedes/${id}`, { method: 'DELETE' });
    return { success: true };
  }

  // --- EQUIPOS / ACTIVOS ---
  async getAssets(filters = {}) {
    const params = new URLSearchParams();
    params.append('limit', '500');

    if (filters.search && filters.search.trim()) {
      params.append('q', filters.search.trim());
    }
    if (filters.sede && filters.sede !== 'all') {
      params.append('sede', filters.sede);
    }
    if (filters.status && filters.status !== 'all') {
      params.append('estado', filters.status);
    }
    if (filters.computerType && filters.computerType !== 'all') {
      params.append('tipo', filters.computerType);
    }
    if (filters.category && filters.category !== 'all') {
      params.append('categoria', filters.category);
    }

    const res = await api(`/api/equipos?${params.toString()}`);
    return res.items || [];
  }

  async getAssetById(id) {
    return await api(`/api/equipos/${id}`);
  }

  async getAssetByCode(code) {
    if (!code) return null;
    const res = await api(`/api/equipos?q=${encodeURIComponent(code)}`);
    const items = res.items || [];
    return items.find(a => a.code.toUpperCase() === code.toUpperCase()) || null;
  }

  async saveAsset(asset) {
    // Limpieza de campos según la API:
    // Textos vacíos se envían como "", fechas y números vacíos como null
    const payload = { ...asset };

    // Si viene id, createdAt, updatedAt, sedeId, eliminarlos para evitar problemas
    const id = payload.id;
    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.sedeId;

    if (payload.code) payload.code = payload.code.trim().toUpperCase();
    if (payload.estimatedValue === '' || payload.estimatedValue === undefined) {
      payload.estimatedValue = null;
    } else if (payload.estimatedValue !== null) {
      payload.estimatedValue = Number(payload.estimatedValue);
    }

    if (!payload.purchaseDate) payload.purchaseDate = null;
    if (!payload.inventoryDate) payload.inventoryDate = null;
    if (!payload.assignmentDate) payload.assignmentDate = null;

    if (id) {
      return await api(`/api/equipos/${id}`, {
        method: 'PATCH',
        body: payload
      });
    } else {
      return await api('/api/equipos', {
        method: 'POST',
        body: payload
      });
    }
  }

  async deleteAsset(id) {
    await api(`/api/equipos/${id}`, { method: 'DELETE' });
    return { success: true };
  }

  async uploadAssetImage(equipoId, file) {
    const res = await fetch(`/api/equipos/${equipoId}/imagen`, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file
    });
    if (!res.ok) {
      let errDetail = 'Error al subir la imagen';
      try {
        const d = await res.json();
        errDetail = d.detail || errDetail;
      } catch (e) {}
      throw new Error(errDetail);
    }
    return await res.json();
  }

  async deleteAssetImage(equipoId) {
    await api(`/api/equipos/${equipoId}/imagen`, { method: 'DELETE' });
    return { success: true };
  }

  // --- PRÉSTAMOS ---
  async getLoans(statusFilter = 'all') {
    const params = new URLSearchParams();
    params.append('limit', '500');

    if (statusFilter && statusFilter !== 'all') {
      params.append('estado', statusFilter);
    }

    const res = await api(`/api/prestamos?${params.toString()}`);
    return res.items || [];
  }

  async getLoanById(id) {
    return await api(`/api/prestamos/${id}`);
  }

  async saveLoan(loan) {
    const payload = {
      assetId: loan.assetId,
      borrowerName: loan.borrowerName,
      borrowerId: loan.borrowerId || '',
      borrowerRole: loan.borrowerRole || '',
      borrowerEmail: loan.borrowerEmail || '',
      borrowerPhone: loan.borrowerPhone || '',
      sede: loan.sede || '',
      purpose: loan.purpose || '',
      conditionOnLoan: loan.conditionOnLoan || '',
      loanDate: loan.loanDate || null,
      expectedReturnDate: loan.expectedReturnDate || null,
      assetName: loan.assetName || '',
      assetCode: loan.assetCode || ''
    };

    if (loan.id) {
      return await api(`/api/prestamos/${loan.id}`, {
        method: 'PATCH',
        body: payload
      });
    } else {
      return await api('/api/prestamos', {
        method: 'POST',
        body: payload
      });
    }
  }

  async returnLoan(loanId, returnNotes = '', newAssetStatus = 'operativo') {
    return await api(`/api/prestamos/${loanId}/devolucion`, {
      method: 'POST',
      body: {
        returnNotes: returnNotes || '',
        newAssetStatus: newAssetStatus || 'operativo'
      }
    });
  }

  // --- MANTENIMIENTOS ---
  async getMaintenances(statusFilter = 'all') {
    const params = new URLSearchParams();
    params.append('limit', '500');

    if (statusFilter && statusFilter !== 'all') {
      params.append('estado', statusFilter);
    }

    const res = await api(`/api/mantenimientos?${params.toString()}`);
    return res.items || [];
  }

  async getMaintenanceById(id) {
    return await api(`/api/mantenimientos/${id}`);
  }

  async saveMaintenance(maint) {
    const payload = {
      assetId: maint.assetId,
      assetCode: maint.assetCode || '',
      assetName: maint.assetName || '',
      type: maint.type,
      status: maint.status || 'programado',
      requestDate: maint.requestDate || null,
      scheduledDate: maint.scheduledDate || null,
      completionDate: maint.completionDate || null,
      technician: maint.technician || '',
      cost: Number(maint.cost) || 0,
      description: maint.description || '',
      replacedParts: maint.replacedParts || '',
      nextScheduledMaintenance: maint.nextScheduledMaintenance || null,
      notes: maint.notes || ''
    };

    if (maint.id) {
      return await api(`/api/mantenimientos/${maint.id}`, {
        method: 'PATCH',
        body: payload
      });
    } else {
      return await api('/api/mantenimientos', {
        method: 'POST',
        body: payload
      });
    }
  }

  async completeMaintenance(maintId, notes = '', newAssetStatus = 'operativo') {
    return await api(`/api/mantenimientos/${maintId}/completar`, {
      method: 'POST',
      body: {
        notes: notes || '',
        newAssetStatus: newAssetStatus || 'operativo'
      }
    });
  }

  // --- CONFIGURACIÓN Y DASHBOARD ---
  async getDashboardStats() {
    return await api('/api/dashboard');
  }

  async getThemeConfig() {
    try {
      const res = await api('/api/configuracion');
      if (res && res.themeConfig && Object.keys(res.themeConfig).length > 0) {
        return { ...DEFAULT_THEME_CONFIG, ...res.themeConfig };
      }
    } catch (e) {
      console.warn('Usando tema por defecto:', e.message);
    }
    return DEFAULT_THEME_CONFIG;
  }

  async saveThemeConfig(themeConfig) {
    const res = await api('/api/configuracion', {
      method: 'PATCH',
      body: { themeConfig }
    });
    return (res && res.themeConfig) ? res.themeConfig : themeConfig;
  }

  async getSettings() {
    try {
      const res = await api('/api/configuracion');
      if (res && res.settings && Object.keys(res.settings).length > 0) {
        return { ...DEFAULT_SETTINGS, ...res.settings };
      }
    } catch (e) {
      console.warn('Usando configuración por defecto:', e.message);
    }
    return DEFAULT_SETTINGS;
  }
}

// Instancia global DB que reemplaza el DataStore de LocalStorage
const DB = new DataStoreAPI();
