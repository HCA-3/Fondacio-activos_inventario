/**
 * FONDACIO COLOMBIA - SERVIDOR LOCAL CON BASE DE DATOS SQLITE
 * Corre la app y guarda todos los datos en data/inventario.db (dentro del Codespace).
 *
 * Uso:   node server.js
 * Luego abrir el puerto 3000 (Codespaces lo muestra en la pestaña "Puertos").
 * No requiere instalar nada: usa el SQLite que ya trae Node.js (v22.5 o superior).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const db = new DatabaseSync(path.join(DATA_DIR, 'inventario.db'));
// Las relaciones (REFERENCES) documentan el vínculo equipo↔mantenimiento/préstamo; no se bloquea
// el guardado si la app elimina un equipo que aún tiene historial.
db.exec('PRAGMA foreign_keys = OFF');

// ==================== ESTRUCTURA DE LA BASE DE DATOS ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS equipos (
    id TEXT PRIMARY KEY,
    code TEXT, sede TEXT, status TEXT, category TEXT,
    orden INTEGER,
    datos TEXT NOT NULL                       -- hoja de vida completa (JSON)
  );
  CREATE TABLE IF NOT EXISTS sedes (
    id TEXT PRIMARY KEY,
    name TEXT,
    orden INTEGER,
    datos TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS prestamos (
    id TEXT PRIMARY KEY,
    asset_id TEXT REFERENCES equipos(id),
    status TEXT,
    orden INTEGER,
    datos TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS mantenimientos (
    id TEXT PRIMARY KEY,
    asset_id TEXT REFERENCES equipos(id),    -- relación con el equipo
    status TEXT,
    orden INTEGER,
    datos TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS configuracion (
    id TEXT PRIMARY KEY,
    datos TEXT NOT NULL
  );

  -- Vista: una fila por equipo con su último mantenimiento y qué se le debe hacer
  DROP VIEW IF EXISTS v_mantenimiento_por_equipo;
  CREATE VIEW v_mantenimiento_por_equipo AS
  WITH m AS (
    SELECT *, ROW_NUMBER() OVER (
      PARTITION BY asset_id
      ORDER BY (status <> 'completado') DESC,
               COALESCE(json_extract(datos,'$.completionDate'), json_extract(datos,'$.scheduledDate')) DESC
    ) AS rn
    FROM mantenimientos
  )
  SELECT
    e.code                                                   AS placa,
    TRIM(COALESCE(json_extract(e.datos,'$.brand'),'') || ' ' ||
         COALESCE(json_extract(e.datos,'$.model'),''))       AS equipo,
    e.sede                                                   AS sede,
    e.status                                                 AS estado_equipo,
    COALESCE(json_extract(m.datos,'$.type'), 'sin registro') AS ultimo_mantenimiento,
    m.status                                                 AS estado_mantenimiento,
    json_extract(m.datos,'$.nextScheduledMaintenance')       AS proximo,
    CASE
      WHEN m.id IS NULL THEN 'PROGRAMAR PREVENTIVO (sin historial)'
      WHEN m.status <> 'completado' THEN 'PENDIENTE: ' || UPPER(json_extract(m.datos,'$.type'))
      WHEN json_extract(m.datos,'$.nextScheduledMaintenance') <= date('now') THEN 'VENCIDO: programar preventivo'
      ELSE 'Al día'
    END                                                      AS accion_requerida,
    json_extract(e.datos,'$.recommendations')                AS que_se_debe_hacer
  FROM equipos e
  LEFT JOIN m ON m.asset_id = e.id AND m.rn = 1
  ORDER BY e.code;

  -- Vista: historial completo de mantenimientos por equipo
  DROP VIEW IF EXISTS v_historial_mantenimientos;
  CREATE VIEW v_historial_mantenimientos AS
  SELECT
    e.code                                         AS placa,
    TRIM(COALESCE(json_extract(e.datos,'$.brand'),'') || ' ' ||
         COALESCE(json_extract(e.datos,'$.model'),'')) AS equipo,
    json_extract(m.datos,'$.type')                 AS tipo,
    m.status                                       AS estado,
    json_extract(m.datos,'$.scheduledDate')        AS programado,
    json_extract(m.datos,'$.completionDate')       AS realizado,
    json_extract(m.datos,'$.technician')           AS tecnico,
    json_extract(m.datos,'$.description')          AS descripcion,
    json_extract(m.datos,'$.nextScheduledMaintenance') AS proximo
  FROM mantenimientos m
  JOIN equipos e ON e.id = m.asset_id
  ORDER BY e.code, json_extract(m.datos,'$.requestDate') DESC;
`);

// Colección de la app (DB.data)  →  tabla SQLite
const COLECCIONES = {
  assets:       { tabla: 'equipos',        cols: a => ({ code: a.code, sede: a.sede, status: a.status, category: a.category }) },
  sedes:        { tabla: 'sedes',          cols: s => ({ name: s.name }) },
  loans:        { tabla: 'prestamos',      cols: l => ({ asset_id: l.assetId, status: l.status }) },
  maintenances: { tabla: 'mantenimientos', cols: m => ({ asset_id: m.assetId, status: m.status }) }
};
const CONFIG_KEYS = ['themeConfig', 'settings'];

const txt = v => (v === undefined || v === null ? null : String(v));

function leerTodo() {
  const vacia = Object.values(COLECCIONES)
    .every(c => db.prepare(`SELECT COUNT(*) AS n FROM ${c.tabla}`).get().n === 0);
  if (vacia) return { vacia: true };

  const out = {};
  for (const [k, c] of Object.entries(COLECCIONES)) {
    out[k] = db.prepare(`SELECT datos FROM ${c.tabla} ORDER BY orden`).all().map(r => JSON.parse(r.datos));
  }
  db.prepare('SELECT id, datos FROM configuracion').all().forEach(r => { out[r.id] = JSON.parse(r.datos); });
  return out;
}

function guardarTodo(data) {
  db.exec('BEGIN');
  try {
    for (const [k, c] of Object.entries(COLECCIONES)) {
      db.exec(`DELETE FROM ${c.tabla}`);
      (data[k] || []).forEach((reg, i) => {
        if (!reg || !reg.id) return;
        const extra = c.cols(reg);
        const nombres = ['id', ...Object.keys(extra), 'orden', 'datos'];
        const valores = [txt(reg.id), ...Object.values(extra).map(txt), i, JSON.stringify(reg)];
        db.prepare(`INSERT INTO ${c.tabla} (${nombres.join(',')}) VALUES (${nombres.map(() => '?').join(',')})`)
          .run(...valores);
      });
    }
    db.exec('DELETE FROM configuracion');
    CONFIG_KEYS.forEach(key => {
      if (data[key]) db.prepare('INSERT INTO configuracion (id, datos) VALUES (?, ?)').run(key, JSON.stringify(data[key]));
    });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// ==================== SERVIDOR WEB ====================
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8'
};

function enviarJSON(res, codigo, obj) {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    let tam = 0;
    req.on('data', c => {
      tam += c.length;
      if (tam > 100 * 1024 * 1024) { reject(new Error('Datos demasiado grandes')); req.destroy(); }
      partes.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(partes).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const ruta = decodeURIComponent(url.pathname);

  try {
    // ---- API ----
    if (ruta === '/api/data' && req.method === 'GET') return enviarJSON(res, 200, leerTodo());

    if (ruta === '/api/data' && req.method === 'PUT') {
      const data = JSON.parse(await leerCuerpo(req));
      guardarTodo(data);
      console.log(`💾 Guardado: ${(data.assets || []).length} equipos, ${(data.loans || []).length} préstamos, ` +
                  `${(data.maintenances || []).length} mantenimientos`);
      return enviarJSON(res, 200, { ok: true });
    }

    // Consultas rápidas desde el navegador
    if (ruta === '/api/mantenimiento') {
      return enviarJSON(res, 200, db.prepare('SELECT * FROM v_mantenimiento_por_equipo').all());
    }
    if (ruta === '/api/historial') {
      return enviarJSON(res, 200, db.prepare('SELECT * FROM v_historial_mantenimientos').all());
    }

    // ---- Archivos de la app ----
    if (req.method !== 'GET' && req.method !== 'HEAD') return enviarJSON(res, 405, { error: 'Método no permitido' });

    let archivo = path.normalize(path.join(ROOT, ruta === '/' ? 'index.html' : ruta));
    const bloqueado = ['data', 'node_modules', '.git'].some(d => archivo.startsWith(path.join(ROOT, d)));
    if (!archivo.startsWith(ROOT) || bloqueado) return enviarJSON(res, 403, { error: 'Prohibido' });
    if (fs.existsSync(archivo) && fs.statSync(archivo).isDirectory()) archivo = path.join(archivo, 'index.html');
    if (!fs.existsSync(archivo)) return enviarJSON(res, 404, { error: 'No encontrado' });

    res.writeHead(200, { 'Content-Type': MIME[path.extname(archivo).toLowerCase()] || 'application/octet-stream',
                         'Cache-Control': 'no-cache' });
    fs.createReadStream(archivo).pipe(res);
  } catch (e) {
    console.error('❌ Error:', e.message);
    enviarJSON(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log('\n🌱 Fondacio Inventario - servidor local con base de datos SQLite');
  console.log(`   App:          http://localhost:${PORT}   (en Codespaces: pestaña "Puertos" → ${PORT})`);
  console.log(`   Base de datos: data/inventario.db`);
  console.log('   Para detener: Ctrl + C\n');
});