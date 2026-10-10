/**
 * FONDACIO COLOMBIA - SISTEMA DE GESTIÓN DE ACTIVOS DE HARDWARE
 * Capa de Datos, Persistencia LocalStorage y Gestión Dinámica de Sedes
 * El inventario arranca vacío: los equipos, préstamos y mantenimientos reales no se guardan en el código.
 */

const STORAGE_KEY = 'fondacio_inventory_v6_db';

// Sedes oficiales de Fondacio Colombia
const DEFAULT_SEDES = [
  {
    id: 'sede-cabo',
    name: 'Altos del Cabo',
    fullName: 'Centro de Ecología Integral Altos del Cabo (Sede Chapinero)',
    code: 'CABO',
    address: 'Cra. 9 Este #96-74 km 5 vía La Calera',
    city: 'Barrio San Luis, Chapinero, Bogotá D.C.',
    phone: '+57 300 5566591',
    email: 's.guerrero@fondacio-co.org',
    color: '#2e7d32',
    focus: 'Centro de ecología integral, proyectos comunitarios, vivero y formación técnica',
    createdAt: '2021-01-01T00:00:00.000Z'
  },
  {
    id: 'sede-pot',
    name: 'YLDC Potosí',
    fullName: 'Centro de Formación YLDC Potosí',
    code: 'POT',
    address: 'Calle 78A Sur No. 38 - 31',
    city: 'Potosí, Ciudad Bolívar, Bogotá D.C.',
    phone: '+57 320 2383795',
    email: 'contacto@fondacio-co.org',
    color: '#1565c0',
    focus: 'Aulas de informática, robótica, lectura comunitaria y desarrollo juvenil',
    createdAt: '2021-01-01T00:00:00.000Z'
  },
  {
    id: 'sede-adm',
    name: 'Sede Administrativa',
    fullName: 'Sede Administrativa Nacional Fondacio',
    code: 'ADM',
    address: 'Calle 166 # 20 - 69',
    city: 'Bogotá D.C.',
    phone: '+57 300 1234567',
    email: 'administracion@fondacio-co.org',
    color: '#8b5cf6',
    focus: 'Dirección ejecutiva, finanzas, voluntariado y proyectos sociales',
    createdAt: '2021-01-01T00:00:00.000Z'
  }
];

// Configuración de temas y colores personalizables
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

const INITIAL_SEED_DATA = {
  sedes: DEFAULT_SEDES,
  themeConfig: DEFAULT_THEME_CONFIG,
  assets: [],
  loans: [],
  maintenances: [],
  settings: {
    orgName: 'Fundación Fondacio Colombia',
    nit: '900.384.129-5',
    email: 'contacto@fondacio-co.org',
    website: 'https://www.fondaciocolombia.org'
  }
};

class DataStore {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.sedes || parsed.sedes.length === 0) {
          parsed.sedes = DEFAULT_SEDES;
        }
        if (!parsed.themeConfig) {
          parsed.themeConfig = DEFAULT_THEME_CONFIG;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error al leer datos de LocalStorage:', e);
    }
    this.saveToStorage(INITIAL_SEED_DATA);
    return JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  }

  saveToStorage(payload) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Error al guardar en LocalStorage:', e);
    }
  }

  commit() {
    this.saveToStorage(this.data);
  }

  // --- MÉTODOS DE SEDES DINÁMICAS ---
  getSedes() {
    return this.data.sedes || DEFAULT_SEDES;
  }

  getSedeById(id) {
    return (this.data.sedes || []).find(s => s.id === id) || null;
  }

  getSedeByName(name) {
    return (this.data.sedes || []).find(s => s.name.toLowerCase() === name.toLowerCase()) || null;
  }

  saveSede(sede) {
    if (!this.data.sedes) this.data.sedes = [...DEFAULT_SEDES];

    if (!sede.id) {
      sede.id = 'sede-' + Date.now().toString(36);
      sede.createdAt = new Date().toISOString();
      this.data.sedes.push(sede);
    } else {
      const index = this.data.sedes.findIndex(s => s.id === sede.id);
      if (index !== -1) {
        this.data.sedes[index] = { ...this.data.sedes[index], ...sede };
      } else {
        this.data.sedes.push(sede);
      }
    }
    this.commit();
    return sede;
  }

  deleteSede(id) {
    if (this.data.sedes.length <= 1) {
      return { success: false, message: 'Debe existir al menos una sede registrada.' };
    }
    this.data.sedes = this.data.sedes.filter(s => s.id !== id);
    this.commit();
    return { success: true };
  }

  // --- MÉTODOS DE TEMA Y PERSONALIZACIÓN DE COLORES ---
  getThemeConfig() {
    return this.data.themeConfig || DEFAULT_THEME_CONFIG;
  }

  saveThemeConfig(config) {
    this.data.themeConfig = { ...DEFAULT_THEME_CONFIG, ...this.data.themeConfig, ...config };
    this.commit();
    return this.data.themeConfig;
  }

  resetThemeConfig() {
    this.data.themeConfig = JSON.parse(JSON.stringify(DEFAULT_THEME_CONFIG));
    this.commit();
    return this.data.themeConfig;
  }

  // --- MÉTODOS DE ACTIVOS (HARDWARE) ---
  getAssets(filters = {}) {
    let result = [...this.data.assets];

    if (filters.search) {
      const query = filters.search.toLowerCase().trim();
      result = result.filter(a => 
        (a.code && a.code.toLowerCase().includes(query)) ||
        (a.brand && a.brand.toLowerCase().includes(query)) ||
        (a.model && a.model.toLowerCase().includes(query)) ||
        (a.serial && a.serial.toLowerCase().includes(query)) ||
        (a.area && a.area.toLowerCase().includes(query)) ||
        (a.assignedTo && a.assignedTo.toLowerCase().includes(query)) ||
        (a.location && a.location.toLowerCase().includes(query)) ||
        (a.processor && a.processor.toLowerCase().includes(query)) ||
        (a.ip && a.ip.toLowerCase().includes(query)) ||
        (a.mac && a.mac.toLowerCase().includes(query)) ||
        (a.networkHostname && a.networkHostname.toLowerCase().includes(query)) ||
        (a.os && a.os.toLowerCase().includes(query))
      );
    }

    if (filters.sede && filters.sede !== 'all') {
      result = result.filter(a => a.sede === filters.sede);
    }

    if (filters.computerType && filters.computerType !== 'all') {
      if (filters.computerType === 'TABLET') {
        result = result.filter(a => a.category === 'tablet' || (a.computerType && a.computerType.toLowerCase().includes('tablet')) || (a.code && a.code.startsWith('TAB')));
      } else {
        result = result.filter(a => a.computerType === filters.computerType);
      }
    }

    if (filters.status && filters.status !== 'all') {
      result = result.filter(a => a.status === filters.status);
    }

    return result;
  }

  getAssetById(id) {
    return this.data.assets.find(a => a.id === id) || null;
  }

  getAssetByCode(code) {
    return this.data.assets.find(a => a.code.toUpperCase() === code.toUpperCase()) || null;
  }

  saveAsset(asset) {
    if (!asset.id) {
      asset.id = 'ast-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
      asset.createdAt = new Date().toISOString();
      this.data.assets.unshift(asset);
    } else {
      const index = this.data.assets.findIndex(a => a.id === asset.id);
      if (index !== -1) {
        this.data.assets[index] = { ...this.data.assets[index], ...asset, updatedAt: new Date().toISOString() };
      } else {
        this.data.assets.unshift(asset);
      }
    }
    this.commit();
    return asset;
  }

  deleteAsset(id) {
    this.data.assets = this.data.assets.filter(a => a.id !== id);
    this.commit();
  }

  // --- MÉTODOS DE PRÉSTAMOS / ASIGNACIONES ---
  getLoans(statusFilter = 'all') {
    if (statusFilter === 'all') return [...this.data.loans];
    return this.data.loans.filter(l => l.status === statusFilter);
  }

  getLoanById(id) {
    return this.data.loans.find(l => l.id === id) || null;
  }

  saveLoan(loan) {
    if (!loan.id) {
      loan.id = 'loan-' + Date.now().toString(36);
      loan.createdAt = new Date().toISOString();
      loan.status = 'activo';
      this.data.loans.unshift(loan);

      const asset = this.getAssetById(loan.assetId);
      if (asset) {
        asset.status = 'prestado';
        asset.assignedTo = loan.borrowerName;
        asset.assignedRole = loan.borrowerRole;
      }
    } else {
      const index = this.data.loans.findIndex(l => l.id === loan.id);
      if (index !== -1) {
        this.data.loans[index] = { ...this.data.loans[index], ...loan };
      }
    }
    this.commit();
    return loan;
  }

  returnLoan(loanId, returnNotes = '', newAssetStatus = 'operativo') {
    const loan = this.getLoanById(loanId);
    if (!loan) return false;

    loan.status = 'devuelto';
    loan.actualReturnDate = new Date().toISOString().split('T')[0];
    loan.returnNotes = returnNotes;

    const asset = this.getAssetById(loan.assetId);
    if (asset) {
      asset.status = newAssetStatus;
      asset.assignedTo = asset.location || 'En Sede';
      asset.assignedRole = 'Disponible en Sede';
    }

    this.commit();
    return true;
  }

  // --- MÉTODOS DE MANTENIMIENTO ---
  getMaintenances(statusFilter = 'all') {
    if (statusFilter === 'all') return [...this.data.maintenances];
    return this.data.maintenances.filter(m => m.status === statusFilter);
  }

  getMaintenanceById(id) {
    return this.data.maintenances.find(m => m.id === id) || null;
  }

  saveMaintenance(maint) {
    if (!maint.id) {
      maint.id = 'maint-' + Date.now().toString(36);
      maint.createdAt = new Date().toISOString();
      this.data.maintenances.unshift(maint);

      if (maint.status === 'en_progreso' || maint.status === 'programado') {
        const asset = this.getAssetById(maint.assetId);
        if (asset) {
          asset.status = 'mantenimiento';
        }
      }
    } else {
      const index = this.data.maintenances.findIndex(m => m.id === maint.id);
      if (index !== -1) {
        this.data.maintenances[index] = { ...this.data.maintenances[index], ...maint };
      }
    }
    this.commit();
    return maint;
  }

  completeMaintenance(maintId, notes = '', newAssetStatus = 'operativo') {
    const maint = this.getMaintenanceById(maintId);
    if (!maint) return false;

    maint.status = 'completado';
    maint.completionDate = new Date().toISOString().split('T')[0];
    if (notes) maint.notes = (maint.notes ? maint.notes + '\n' : '') + notes;

    const asset = this.getAssetById(maint.assetId);
    if (asset) {
      asset.status = newAssetStatus;
    }

    this.commit();
    return true;
  }

  // --- MÉTRICAS Y ESTADÍSTICAS ---
  getDashboardStats() {
    const assets = this.data.assets;
    const total = assets.length;
    const operativos = assets.filter(a => a.status === 'operativo').length;
    const prestados = assets.filter(a => a.status === 'prestado').length;
    const mantenimiento = assets.filter(a => a.status === 'mantenimiento').length;
    const bodega = assets.filter(a => a.status === 'bodega').length;
    const baja = assets.filter(a => a.status === 'baja').length;
    
    const totalValue = assets.reduce((sum, a) => sum + (Number(a.estimatedValue) || 0), 0);

    const sedes = this.getSedes();
    const bySede = {};
    sedes.forEach(s => {
      bySede[s.name] = assets.filter(a => a.sede === s.name).length;
    });

    const byType = {};
    assets.forEach(a => {
      const t = a.category === 'tablet' || (a.code && a.code.startsWith('TAB')) ? 'TABLETS' : (a.computerType || 'Otros');
      byType[t] = (byType[t] || 0) + 1;
    });

    return {
      total,
      operativos,
      prestados,
      mantenimiento,
      bodega,
      baja,
      totalValue,
      bySede,
      byCategory: byType,
      activeLoansCount: this.data.loans.filter(l => l.status === 'activo').length,
      pendingMaintCount: this.data.maintenances.filter(m => m.status !== 'completado').length
    };
  }

  // --- IMPORTACIÓN / EXPORTACIÓN ---
  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.assets && Array.isArray(parsed.assets)) {
        this.data = parsed;
        if (!this.data.sedes) this.data.sedes = DEFAULT_SEDES;
        this.commit();
        return { success: true, count: parsed.assets.length };
      }
      return { success: false, message: 'El archivo no tiene la estructura válida.' };
    } catch (e) {
      return { success: false, message: 'Formato JSON inválido.' };
    }
  }

  resetToInitial() {
    this.data = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
    this.commit();
    return true;
  }
}

// Instancia global
const DB = new DataStore();
