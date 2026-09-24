/**
 * FONDACIO COLOMBIA - Conexión de la app con la base de datos local (SQLite en el Codespace)
 *
 * - data.js sigue igual. Este archivo intercepta DB.commit(): cada cambio se envía al
 *   servidor (server.js), que lo guarda en data/inventario.db.
 * - Al abrir la app carga los datos desde la base de datos.
 *   La primera vez (base vacía) sube automáticamente los datos de data.js.
 *
 * Orden en index.html:  data.js  →  local-db.js  →  resto de scripts.
 * La app debe abrirse con "node server.js" (puerto 3000), no con Live Server.
 */
(function () {
  if (typeof DB === 'undefined' || !DB.data) {
    console.error('[BD local] No se encontró DB. Carga local-db.js después de data.js.');
    return;
  }

  const commitLocal = DB.commit.bind(DB);
  let listo = false;
  let temporizador = null;
  let cola = Promise.resolve();

  function aviso(msg, tipo = 'info') {
    if (typeof showToast === 'function') showToast(msg, tipo);
    else console.log(`[${tipo}] ${msg}`);
  }

  async function guardar() {
    const res = await fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DB.data)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  // Cada vez que la app guarda algo, también se envía a la base de datos
  DB.commit = function () {
    commitLocal();
    if (!listo) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      cola = cola.then(guardar).catch(e => {
        console.error('[BD local] Error al guardar:', e);
        aviso('No se pudo guardar en la base de datos. ¿Está corriendo "node server.js"?', 'error');
      });
    }, 300);
  };

  function refrescarPantalla() {
    ['applyInventoryFilters', 'renderDashboard', 'renderLoans', 'renderLoansList',
     'renderMaintenances', 'renderMaintenanceList', 'renderSedes', 'renderSedesList',
     'renderDiagnostico', 'updateSidebarCounts', 'updateBadges', 'populateSedeSelects'
    ].forEach(fn => {
      if (typeof window[fn] === 'function') {
        try { window[fn](); } catch (e) { console.warn(`[BD local] ${fn}:`, e); }
      }
    });
    if (window.lucide) lucide.createIcons();
  }

  async function cargar() {
    let res;
    try {
      res = await fetch('/api/data', { cache: 'no-store' });
    } catch (e) {
      aviso('Sin conexión con la base de datos local. Ejecuta "node server.js".', 'error');
      return;
    }
    if (!res.ok) {
      console.error('[BD local] /api/data respondió', res.status);
      aviso('La app no está abierta desde "node server.js" (puerto 3000). Los datos NO se guardan en la base de datos.', 'error');
      return;
    }

    const remoto = await res.json();

    if (remoto.vacia) {
      listo = true;
      await guardar();
      aviso(`Datos migrados a la base de datos: ${DB.data.assets.length} equipos, ` +
            `${DB.data.loans.length} préstamos, ${DB.data.maintenances.length} mantenimientos.`, 'success');
      return;
    }

    const antes = JSON.stringify(DB.data);
    ['assets', 'sedes', 'loans', 'maintenances'].forEach(k => { DB.data[k] = remoto[k] || []; });
    if (remoto.themeConfig) DB.data.themeConfig = remoto.themeConfig;
    if (remoto.settings) DB.data.settings = remoto.settings;
    commitLocal();
    listo = true;

    if (JSON.stringify(DB.data) !== antes) refrescarPantalla();
    console.log('[BD local] Datos cargados desde data/inventario.db');
  }

  window.DB_READY = cargar();
})();