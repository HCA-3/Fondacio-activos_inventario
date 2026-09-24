/**
 * FONDACIO - Revisar la base de datos local desde la terminal del Codespace
 * Uso:  node revisar-db.js
 * Opcional:  node revisar-db.js PC-02     (historial de un equipo)
 */
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const ruta = path.join(__dirname, 'data', 'inventario.db');
if (!fs.existsSync(ruta)) {
  console.log('\n⚠️  Aún no existe la base de datos (data/inventario.db).');
  console.log('   1. Ejecuta:  node server.js');
  console.log('   2. Abre la app en el puerto 3000 para que se suban los datos.\n');
  process.exit(0);
}

const db = new DatabaseSync(ruta, { readOnly: true });
const placa = process.argv[2];

if (placa) {
  console.log(`\n🔧 HISTORIAL DE MANTENIMIENTOS: ${placa.toUpperCase()}`);
  console.table(db.prepare(
    'SELECT tipo, estado, programado, realizado, tecnico, proximo FROM v_historial_mantenimientos WHERE UPPER(placa) = UPPER(?)'
  ).all(placa));
  process.exit(0);
}

console.log('\n📦 TABLAS (data/inventario.db)');
for (const t of ['equipos', 'sedes', 'prestamos', 'mantenimientos']) {
  const n = db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
  console.log(`   ✅ ${t.padEnd(15)} ${n} registros`);
}

console.log('\n💻 EQUIPOS');
console.table(db.prepare('SELECT code AS placa, sede, status AS estado, category AS tipo FROM equipos ORDER BY code').all());

console.log('\n🔧 MANTENIMIENTO POR EQUIPO');
console.table(db.prepare(
  'SELECT placa, equipo, ultimo_mantenimiento, proximo, accion_requerida FROM v_mantenimiento_por_equipo'
).all());

console.log('Tip: para ver el historial de un equipo:  node revisar-db.js PC-02\n');