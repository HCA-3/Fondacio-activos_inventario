# Guía para migrar el frontend a la API

Esta guía es para quienes mantienen `frontend/`. Explica cómo levantar el backend en tu máquina y cómo cambiar cada módulo para que deje de guardar en `localStorage` y use la API.

Se actualiza a medida que el backend crece. Lo que ya está disponible:

| Módulo | Estado |
|---|---|
| Sesión (login, logout, usuario actual) | Disponible |
| Usuarios | Disponible (solo administradores) |
| Sedes, equipos, préstamos, mantenimientos | Disponible |
| Configuración (tema y datos de la organización) | Disponible |
| Panel, exportación a Excel, fotos | Disponible |
| Donaciones (donantes, categorías, ítems, comprobante, conversión a equipo, Excel) | Disponible (secciones 15 a 17) |

## 1. Levantar todo en tu máquina

Necesitas Docker. Desde la raíz del repo:

```bash
docker compose up --build
```

- La aplicación queda en `http://localhost:8000`.
- La documentación interactiva de la API queda en `http://localhost:8000/docs`. Ahí puedes probar cada ruta sin escribir código.
- Los cambios en `frontend/` se ven al recargar la página. No hace falta reconstruir.
- Si cambia algo en `backend/`, vuelve a correr el comando con `--build`.

La base de datos arranca vacía. Crea tu usuario administrador una sola vez, con la aplicación corriendo:

```bash
docker compose exec app python -m scripts.crear_admin
```

Para borrar la base local y empezar de cero: `docker compose down --volumes`.

## 2. Reglas generales de la API

- **Mismo dominio.** El frontend y la API salen de la misma dirección, así que las rutas son relativas: `fetch('/api/...')`. No hay CORS.
- **Sesión por cookie.** Al iniciar sesión el servidor pone una cookie que el navegador envía solo en cada petición. JavaScript no puede leerla y no hay que guardar ningún token.
- **JSON en camelCase**, con los mismos nombres que ya usan los objetos del frontend.
- **Cuerpos en JSON.** Envía siempre la cabecera `Content-Type: application/json`.
- **Campos desconocidos se rechazan.** Si envías un campo que la ruta no espera, responde 422. La excepción son los equipos, que aceptan campos libres para la ficha técnica.
- **Los cambios son parciales.** `PATCH` solo modifica los campos que envías; el resto queda igual.
- **Campos vacíos.** Los textos vacíos se guardan como `""`. Las fechas y los valores numéricos vacíos (`""`) se guardan y se devuelven como `null`.
- **Fechas** en formato `AAAA-MM-DD`. "Hoy" se calcula en hora de Colombia.
- **Los `id` los pone el servidor.** No generes ids en el frontend.

### Errores

Todos los errores traen un campo `detail`:

| Código | Significado | `detail` |
|---|---|---|
| 401 | No hay sesión o venció | Texto. Muestra la pantalla de login. |
| 403 | El rol no tiene permiso | Texto |
| 404 | El registro o la ruta no existe | Texto |
| 409 | La acción choca con el estado actual (un nombre repetido, un equipo que no está disponible) | Texto listo para mostrar al usuario |
| 422 | Datos inválidos | Lista de objetos `{loc, msg, type}`, uno por campo |
| 429 | Demasiados intentos fallidos de login | Texto. La cabecera `Retry-After` dice cuántos segundos esperar. |

### Listas

Todas las listas responden con la misma forma:

```json
{ "items": [], "total": 0, "limit": 100, "offset": 0 }
```

`limit` (máximo 500) y `offset` se pasan en la URL: `/api/usuarios?limit=50&offset=100`.

### Función de ayuda sugerida

Una sola función para todas las llamadas evita repetir el manejo de errores:

```js
async function api(ruta, { method = 'GET', body } = {}) {
  const res = await fetch(ruta, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 401 && ruta !== '/api/auth/login') {
    mostrarLogin();
    throw new Error('Sesión vencida');
  }
  if (res.status === 204) return null;
  const datos = await res.json();
  if (!res.ok) {
    const detalle = Array.isArray(datos.detail)
      ? datos.detail.map(e => e.msg).join('. ')
      : datos.detail;
    throw new Error(detalle);
  }
  return datos;
}
```

## 3. Sesión

| Acción | Petición | Respuesta |
|---|---|---|
| Iniciar sesión | `POST /api/auth/login` con `{username, password}` | 200 con el usuario |
| Usuario actual | `GET /api/auth/me` | 200 con el usuario, o 401 |
| Cambiar mi contraseña | `POST /api/auth/contrasena` con `{password}` | 200 con `{"mensaje": "..."}` |
| Cerrar sesión | `POST /api/auth/logout` | 204 |

El usuario tiene esta forma:

```json
{
  "id": "db18371d-cd4c-4ba5-9e44-73b99fb101d7",
  "username": "ana",
  "name": "Ana Pérez",
  "role": "admin",
  "active": true,
  "createdAt": "2026-10-10T21:23:22.403401Z"
}
```

Detalles:

- El nombre de usuario no distingue mayúsculas.
- La sesión dura 8 horas. Después, cualquier ruta responde 401.
- Tras 5 contraseñas incorrectas seguidas, ese usuario queda bloqueado 15 minutos (429).
- Un usuario inexistente y una contraseña incorrecta responden igual, a propósito.

Ejemplo:

```js
const usuario = await api('/api/auth/login', {
  method: 'POST',
  body: { username: 'ana', password: 'su-contraseña' }
});

const yo = await api('/api/auth/me');

await api('/api/auth/logout', { method: 'POST' });
```

### Lo que hay que hacer en el frontend

- [ ] Una pantalla de login con usuario y contraseña.
- [ ] Al cargar la página, llamar a `/api/auth/me`. Si responde 401, mostrar el login; si no, entrar a la aplicación.
- [ ] Mostrar el nombre del usuario y un botón de cerrar sesión.
- [ ] Mostrar el mensaje de `detail` cuando el login falle (401 o 429).
- [ ] Ocultar los botones de crear, editar y borrar cuando `role` sea `consulta`. El servidor los rechaza de todas formas con 403.

## 4. Roles

| Rol | Puede |
|---|---|
| `admin` | Todo, incluida la gestión de usuarios |
| `consulta` | Ver todo y descargar el Excel. No puede crear, editar ni borrar. |

## 5. Usuarios (solo `admin`)

| Acción | Petición | Respuesta |
|---|---|---|
| Listar | `GET /api/usuarios` | 200 con una lista paginada |
| Crear | `POST /api/usuarios` con `{username, name, password, role}` | 201 con el usuario; 409 si el nombre ya existe |
| Cambiar nombre, rol o estado | `PATCH /api/usuarios/{id}` con cualquiera de `{name, role, active}` | 200 con el usuario |
| Restablecer contraseña | `POST /api/usuarios/{id}/contrasena` con `{password}` | 204 |

Reglas:

- `username`: de 3 a 50 caracteres; letras, números, punto, guion y guion bajo.
- `password`: mínimo 8 caracteres.
- Solo el usuario administrador principal (`admin`) tiene autorización para crear nuevos usuarios (403 para cualquier otro usuario).
- No se borran usuarios: se desactivan con `{active: false}`. Eso cierra sus sesiones.
- Restablecer la contraseña también cierra las sesiones de ese usuario.
- Un administrador no puede desactivarse ni quitarse el rol a sí mismo (409).

La gestión de usuarios está integrada en el panel **Base de Datos & Ajustes** (`#panel-user-management`), visible y operativa exclusivamente al iniciar sesión como `admin`.

## 6. Equivalencias con `DataStore`

Lo que hoy hace cada método de `js/data.js` y la ruta que lo reemplaza:

| Hoy | Con la API |
|---|---|
| `DB.getSedes()` | `GET /api/sedes` |
| `DB.getSedeById(id)` | `GET /api/sedes/{id}` |
| `DB.saveSede(sede)` | `POST /api/sedes` si es nueva; `PATCH /api/sedes/{id}` si existe |
| `DB.deleteSede(id)` | `DELETE /api/sedes/{id}` |
| `DB.getAssets(filtros)` | `GET /api/equipos?sede=&estado=&categoria=&tipo=&q=` |
| `DB.getAssetById(id)` | `GET /api/equipos/{id}` |
| `DB.getAssetByCode(code)` | `GET /api/equipos?q={code}` y buscar la placa exacta en `items` |
| `DB.saveAsset(asset)` | `POST /api/equipos` si es nuevo; `PATCH /api/equipos/{id}` si existe |
| `DB.deleteAsset(id)` | `DELETE /api/equipos/{id}` |
| `DB.getLoans(estado)` | `GET /api/prestamos?estado=` |
| `DB.getLoanById(id)` | `GET /api/prestamos/{id}` |
| `DB.saveLoan(loan)` | `POST /api/prestamos` si es nuevo; `PATCH /api/prestamos/{id}` si existe |
| `DB.returnLoan(id, notas, estado)` | `POST /api/prestamos/{id}/devolucion` |
| `DB.getMaintenances(estado)` | `GET /api/mantenimientos?estado=` |
| `DB.getMaintenanceById(id)` | `GET /api/mantenimientos/{id}` |
| `DB.saveMaintenance(m)` | `POST /api/mantenimientos` si es nuevo; `PATCH /api/mantenimientos/{id}` si existe |
| `DB.completeMaintenance(id, notas, estado)` | `POST /api/mantenimientos/{id}/completar` |
| `DB.getThemeConfig()` | `GET /api/configuracion` → `themeConfig` |
| `DB.saveThemeConfig(config)` | `PATCH /api/configuracion` con `{themeConfig: {...}}` |
| `DB.data.settings` | `GET /api/configuracion` → `settings` |
| `DB.getDashboardStats()` | `GET /api/dashboard` |
| `exportInventoryToExcel()` | Descargar `GET /api/equipos/export.xlsx` |
| Foto elegida en el formulario (base64) | `PUT /api/equipos/{id}/imagen` |
| `DB.exportJSON()`, `DB.importJSON()`, `DB.resetToInitial()` | Desaparecen: los datos viven en el servidor |

Lo que cambia de fondo:

- **Todo es asíncrono.** Cada lectura es una petición; ya no hay un arreglo en memoria con todo el inventario.
- **Filtrar y buscar es trabajo del servidor.** Se pasan los filtros en la URL en vez de filtrar un arreglo.
- **El servidor mueve el estado del equipo.** Al prestar, devolver, abrir o completar un mantenimiento, el frontend ya no toca `asset.status` ni `asset.assignedTo`: después de la acción, vuelve a pedir el equipo.

## 7. Sedes

| Acción | Petición | Respuesta |
|---|---|---|
| Listar | `GET /api/sedes` | Lista paginada, ordenada por nombre |
| Ver | `GET /api/sedes/{id}` | La sede |
| Crear | `POST /api/sedes` | 201 con la sede |
| Cambiar | `PATCH /api/sedes/{id}` | La sede |
| Borrar | `DELETE /api/sedes/{id}` | 204 |

Campos: `name` (obligatorio), `fullName`, `code`, `address`, `city`, `phone`, `email`, `color`, `focus`. La respuesta añade `id`, `createdAt` y `updatedAt`.

Reglas:

- El nombre no se repite, sin distinguir mayúsculas (409).
- No se borra una sede con equipos, ni una que aparezca en préstamos, ni la última que quede (409).
- Si se cambia el nombre de una sede, los equipos lo muestran actualizado solos.

## 8. Equipos

| Acción | Petición | Respuesta |
|---|---|---|
| Listar | `GET /api/equipos` | Lista paginada con el **resumen** de cada equipo |
| Ver | `GET /api/equipos/{id}` | El equipo **completo** |
| Crear | `POST /api/equipos` | 201 con el equipo completo |
| Cambiar | `PATCH /api/equipos/{id}` | El equipo completo |
| Borrar | `DELETE /api/equipos/{id}` | 204 |
| Historial de préstamos | `GET /api/equipos/{id}/prestamos` | Lista paginada |
| Historial de mantenimientos | `GET /api/equipos/{id}/mantenimientos` | Lista paginada |

### Resumen y equipo completo

La lista trae solo estos campos:

`id`, `code`, `sede`, `sedeId`, `status`, `category`, `computerType`, `brand`, `model`, `serial`, `area`, `assignedTo`, `assignedRole`, `location`, `condition`, `estimatedValue`, `purchaseDate`, `image`, `createdAt`, `updatedAt`.

El detalle trae esos mismos campos y, al mismo nivel, todos los de la ficha técnica (`processor`, `ram`, `disk1Brand`, `ip`, `mac`, `os`, `licenseState`, …) con los nombres que el frontend ya usa. Para pintar la tabla o las tarjetas basta la lista; para la hoja de vida, el QR o el formulario de edición hay que pedir el detalle.

### Crear y cambiar

- Obligatorios al crear: `code` y `sede`.
- `sede` es el **nombre** de la sede, como hoy. También acepta el `id`.
- `code` se guarda en mayúsculas y no se repite (409).
- Cualquier campo que no esté en la lista de arriba se guarda en la ficha técnica. Debe ser texto, número, booleano o `null`.
- En un `PATCH`, enviar un campo de la ficha en `null` lo elimina.
- Se puede reenviar el equipo completo al guardar: `id`, `createdAt`, `updatedAt` y `sedeId` se ignoran.
- `image` es una ruta o URL de hasta 500 caracteres. No admite la imagen incrustada en base64: las fotos se suben aparte (sección 14).

### Estado

Valores: `operativo`, `bodega`, `prestado`, `mantenimiento`, `baja`.

- A mano solo se eligen `operativo`, `bodega` y `baja`.
- `prestado` y `mantenimiento` los pone el servidor. Enviarlos responde 409, salvo que el equipo ya esté en ese estado.
- Mientras el equipo tenga un préstamo activo o un mantenimiento abierto, su estado no se puede cambiar (409). El resto de campos sí.

### Borrar

Un equipo con préstamos o mantenimientos en su historial no se borra (409): se marca `baja`.

### Filtros

| Parámetro | Efecto |
|---|---|
| `sede` | Nombre o id de la sede |
| `estado` | Uno de los cinco estados |
| `categoria` | Coincidencia exacta con `category`, sin distinguir mayúsculas |
| `tipo` | Coincidencia exacta con `computerType`, sin distinguir mayúsculas |
| `q` | Busca en placa, marca, modelo, serial, área, responsable, ubicación, procesador, IP, MAC, nombre de red y sistema operativo |

Para no filtrar, omite el parámetro (no envíes `all`).

```js
const { items, total } = await api('/api/equipos?sede=Altos del Cabo&estado=operativo&q=dell');

const equipo = await api(`/api/equipos/${id}`);

const creado = await api('/api/equipos', {
  method: 'POST',
  body: { code: 'PC-10', sede: 'Altos del Cabo', brand: 'Dell', model: 'Latitude 5490', ram: '16 GB' }
});

await api(`/api/equipos/${id}`, { method: 'PATCH', body: { location: 'Sala 2', ram: '32 GB' } });
```

## 9. Préstamos

| Acción | Petición | Respuesta |
|---|---|---|
| Listar | `GET /api/prestamos` | Lista paginada, del más reciente al más antiguo |
| Ver | `GET /api/prestamos/{id}` | El préstamo |
| Prestar | `POST /api/prestamos` | 201 con el préstamo |
| Corregir datos | `PATCH /api/prestamos/{id}` | El préstamo |
| Devolver | `POST /api/prestamos/{id}/devolucion` | El préstamo |

Los préstamos no se borran: la lista es el historial.

Campos al prestar:

| Campo | Notas |
|---|---|
| `assetId` | Obligatorio |
| `borrowerName` | Obligatorio |
| `borrowerId`, `borrowerRole`, `borrowerEmail`, `borrowerPhone` | Opcionales |
| `sede` | Nombre o id. Si falta, se usa la sede del equipo |
| `purpose`, `conditionOnLoan` | Opcionales |
| `loanDate` | Si falta, hoy |
| `expectedReturnDate` | Opcional |
| `assetName` | Opcional. Si falta, se usa "marca modelo" |
| `assetCode` | Se acepta pero se ignora: se guarda la placa real del equipo |

La respuesta añade `id`, `assetCode`, `status` (`activo` o `devuelto`), `actualReturnDate`, `returnNotes`, `createdAt`, `updatedAt` y `overdue`.

Reglas:

- Solo se presta un equipo en estado `operativo` o `bodega` (409 si no).
- Al prestar, el servidor pone el equipo en `prestado` y copia el prestatario en `assignedTo` y `assignedRole`.
- `overdue` es `true` cuando el préstamo está activo y su `expectedReturnDate` ya pasó. No es un estado: lo calcula el servidor en cada respuesta.
- `assetCode` y `assetName` son una copia del día de la entrega, para el acta. No cambian si después se edita el equipo.

Devolver:

```js
await api(`/api/prestamos/${id}/devolucion`, {
  method: 'POST',
  body: { returnNotes: 'Sin novedades', newAssetStatus: 'operativo' }
});
```

- El cuerpo es opcional. `newAssetStatus` puede ser `operativo` (por defecto), `bodega` o `baja`.
- El servidor pone la fecha de devolución (hoy) y libera el equipo.
- Si el equipo tiene un mantenimiento abierto, queda en `mantenimiento` en vez del estado pedido.
- Devolver dos veces el mismo préstamo responde 409.

Filtros:

| Parámetro | Efecto |
|---|---|
| `estado` | `activo`, `devuelto` o `vencido` (los activos con la fecha pasada) |
| `sede` | Nombre o id |
| `documento` | Documento exacto del prestatario: su historial |
| `equipo` | Id del equipo |
| `desde`, `hasta` | Rango de `loanDate` |

En un `PATCH` se pueden corregir los datos del prestatario, las fechas, `purpose`, `conditionOnLoan`, `returnNotes` y `sede`. No se puede cambiar el equipo ni el estado.

## 10. Mantenimientos

| Acción | Petición | Respuesta |
|---|---|---|
| Listar | `GET /api/mantenimientos` | Lista paginada, del más reciente al más antiguo |
| Ver | `GET /api/mantenimientos/{id}` | El mantenimiento |
| Crear | `POST /api/mantenimientos` | 201 con el mantenimiento |
| Cambiar | `PATCH /api/mantenimientos/{id}` | El mantenimiento |
| Completar | `POST /api/mantenimientos/{id}/completar` | El mantenimiento |

Campos al crear:

| Campo | Notas |
|---|---|
| `assetId` | Obligatorio |
| `type` | Obligatorio: `preventivo`, `correctivo` o `upgrade` |
| `status` | `programado` (por defecto), `en_progreso` o `completado` |
| `requestDate` | Si falta, hoy |
| `scheduledDate`, `nextScheduledMaintenance` | Opcionales |
| `completionDate` | Solo si se crea ya `completado`. Si falta, hoy |
| `technician`, `description`, `replacedParts`, `notes` | Opcionales |
| `cost` | Número, 0 por defecto |
| `assetName`, `assetCode` | Igual que en préstamos |

Reglas:

- Un mantenimiento `programado` o `en_progreso` pone el equipo en `mantenimiento`.
- Si el equipo está prestado, sigue figurando como `prestado`.
- Uno creado ya `completado` es solo un registro histórico: no mueve el estado del equipo.
- Un equipo dado de baja no admite mantenimientos abiertos (409).
- Con `PATCH` se pasa de `programado` a `en_progreso` y se corrigen datos. No se puede pasar a `completado` ni reabrir uno completado (409).

Completar:

```js
await api(`/api/mantenimientos/${id}/completar`, {
  method: 'POST',
  body: { notes: 'Se cambió el ventilador', newAssetStatus: 'operativo' }
});
```

- El cuerpo es opcional. `notes` se añade al final de las notas existentes.
- El servidor pone la fecha de realización (hoy) y libera el equipo, salvo que tenga otro mantenimiento abierto o esté prestado.

Filtros: `estado`, `tipo` y `equipo` (id).

## 11. Configuración

| Acción | Petición | Respuesta |
|---|---|---|
| Leer | `GET /api/configuracion` | `{themeConfig: {...}, settings: {...}}` |
| Cambiar (solo `admin`) | `PATCH /api/configuracion` | La configuración completa |

- `themeConfig` son los colores del tema y `settings` los datos de la organización (`orgName`, `nit`, `email`, `website`). Los dos son objetos de texto a texto.
- Es global: la ven todos los usuarios.
- Si nunca se ha guardado nada, los dos objetos llegan vacíos y el frontend debe usar sus valores por defecto.
- `PATCH` mezcla: las claves que no envías se conservan.
- El modo claro u oscuro sigue siendo preferencia de cada navegador (`localStorage`).
- Hace falta sesión para leerla, así que la pantalla de login usa los colores por defecto.

## 12. Panel

`GET /api/dashboard` devuelve los totales ya calculados, con los mismos nombres que `DB.getDashboardStats()`:

```json
{
  "total": 9,
  "operativos": 6,
  "prestados": 2,
  "mantenimiento": 1,
  "bodega": 0,
  "baja": 0,
  "totalValue": 9700000,
  "bySede": { "Altos del Cabo": 9, "Sede Administrativa": 0, "YLDC Potosí": 0 },
  "byCategory": { "PORTÁTIL": 4, "TABLETS": 5 },
  "activeLoansCount": 2,
  "overdueLoansCount": 0,
  "pendingMaintCount": 1,
  "donationsThisMonth": 3,
  "itemsReceivedThisMonth": 42
}
```

- `bySede` incluye las sedes sin equipos, en cero.
- `byCategory` agrupa igual que antes: las tablets juntas en `TABLETS`, el resto por `computerType`, y `Otros` si no tiene.
- `overdueLoansCount` es nuevo: los préstamos activos con la fecha de devolución pasada.
- `donationsThisMonth` es nuevo: las donaciones `recibida` cuya `donationDate` cae en el mes en curso, en hora de Colombia. Las anuladas no cuentan.
- `itemsReceivedThisMonth` es nuevo: la suma de `quantity` de los ítems de esas mismas donaciones (unidades, no filas).

El resto del panel sale de las listas:

| Bloque del panel | Petición |
|---|---|
| Préstamos vigentes | `GET /api/prestamos?estado=activo` |
| Mantenimientos en curso | `GET /api/mantenimientos?estado=en_progreso` y `?estado=programado` |
| Últimos equipos registrados | `GET /api/equipos?limit=3` (vienen del más reciente al más antiguo) |

## 13. Exportar a Excel

`GET /api/equipos/export.xlsx` devuelve el archivo con las mismas cuatro hojas y columnas que generaba `exportInventoryToExcel()`. Acepta los mismos filtros que la lista de equipos y trae todos los equipos que coincidan, sin paginar.

Como es una descarga, basta un enlace:

```js
const filtros = new URLSearchParams({ sede: 'Altos del Cabo', estado: 'operativo' });
window.location.href = `/api/equipos/export.xlsx?${filtros}`;
```

Con esto se puede quitar del `index.html` la librería SheetJS (`xlsx.full.min.js`), que es de las más pesadas de la página.

Las donaciones tienen su propio Excel en `GET /api/donaciones/export.xlsx` (sección 17).

## 14. Fotos de los equipos

| Acción | Petición | Respuesta |
|---|---|---|
| Subir o reemplazar (solo `admin`) | `PUT /api/equipos/{id}/imagen` | El equipo completo, con `image` actualizado |
| Ver | `GET /api/equipos/{id}/imagen` | La imagen en WebP |
| Quitar (solo `admin`) | `DELETE /api/equipos/{id}/imagen` | 204 |

El cuerpo del `PUT` es el archivo tal cual, sin formulario ni base64:

```js
const archivo = document.getElementById('asset-image-file').files[0];
const res = await fetch(`/api/equipos/${id}/imagen`, {
  method: 'PUT',
  headers: { 'Content-Type': archivo.type },
  body: archivo
});
const equipo = await res.json();
```

- Formatos: JPEG, PNG y WebP. Máximo 10 MB (413 si se pasa).
- El servidor la reduce a 1280 px de lado como máximo y la guarda en WebP.
- Después de subirla, `image` del equipo vale `/api/equipos/{id}/imagen?v=...` y sirve directamente como `src` de un `<img>`. No hay que hacer nada más para mostrarla.
- Esa dirección cambia cada vez que se reemplaza la foto, así que el navegador nunca muestra una vieja.
- El equipo debe existir antes de subirle la foto: al crear uno nuevo, primero `POST /api/equipos` y luego el `PUT` con el `id` que devuelve.
- Si con un `PATCH` se cambia `image` por otra ruta o se deja vacío, la foto subida se descarta.
- Las imágenes de `frontend/img/` siguen funcionando igual: son rutas normales en `image`.

## 15. Donantes

| Acción | Petición | Respuesta |
|---|---|---|
| Listar | `GET /api/donantes` | Lista paginada, ordenada por nombre |
| Ver | `GET /api/donantes/{id}` | El donante |
| Crear (solo `admin`) | `POST /api/donantes` | 201 con el donante |
| Cambiar o desactivar (solo `admin`) | `PATCH /api/donantes/{id}` | El donante |

Campos: `name` (obligatorio), `type` (`persona`, por defecto, o `empresa`), `contact`, `notes` y `active` (`true` por defecto). La respuesta añade `id`, `createdAt` y `updatedAt`.

```json
{
  "id": "f39bb7fe-595b-48e4-a7b5-35ecae8e3bdf",
  "name": "Empresa Aliada SAS",
  "type": "empresa",
  "contact": "aliada@example.com",
  "notes": "",
  "active": true,
  "createdAt": "2026-11-10T20:40:51.980079Z",
  "updatedAt": "2026-11-10T20:40:51.980079Z"
}
```

Reglas:

- El nombre no se repite, sin distinguir mayúsculas (409).
- Los donantes no se borran: se desactivan con `{active: false}`. Sus donaciones se conservan.
- Un donante inactivo no puede recibir donaciones nuevas (409 al crear una donación o al cambiar el donante de una).
- El historial de un donante es la lista de donaciones filtrada por él: `GET /api/donaciones?donante={id}`.

Filtros de la lista: `activo` (`true` o `false`) y `q` (texto en el nombre o el contacto).

## 16. Categorías de los ítems donados

| Acción | Petición | Respuesta |
|---|---|---|
| Listar | `GET /api/categorias` | Lista paginada, ordenada por nombre |
| Ver | `GET /api/categorias/{id}` | La categoría |
| Crear (solo `admin`) | `POST /api/categorias` con `{name}` | 201 con la categoría |
| Renombrar o desactivar (solo `admin`) | `PATCH /api/categorias/{id}` con `{name}` o `{active}` | La categoría |
| Borrar (solo `admin`) | `DELETE /api/categorias/{id}` | 204 |

Campos: `name` y `active`. La respuesta añade `id`, `createdAt` y `updatedAt`.

Reglas:

- Viene precargada con un catálogo inicial: Computadores, Portátiles, Tablets, Mesas, Sillas, Escritorios, Estantes, Electrodomésticos, Utensilios de cocina, Papelería, Libros, Material didáctico, Herramientas y Otros.
- El nombre no se repite, sin distinguir mayúsculas ni espacios de más: `"  sillas "` choca con `Sillas` (409).
- `GET /api/categorias?active=true` trae solo las que se ofrecen en formularios nuevos. Desactivar es la forma normal de dejar de ofrecer una: los ítems que ya la usan no cambian.
- Al borrar una categoría sus ítems siguen existiendo "Sin categoría": `categoryId` pasa a `null` y `categoryName` a `""`.
- Estas categorías son solo de los ítems donados. El campo `category` de los equipos sigue siendo texto libre.

## 17. Donaciones

Cada donación es un acta: un donante, una sede destino, una fecha, uno o más ítems y un comprobante opcional.

| Acción | Petición | Respuesta |
|---|---|---|
| Listar | `GET /api/donaciones` | Lista paginada, de la más reciente a la más antigua (por `donationDate`) |
| Ver | `GET /api/donaciones/{id}` | La donación con sus ítems |
| Crear (solo `admin`) | `POST /api/donaciones` | 201 con la donación |
| Cambiar (solo `admin`) | `PATCH /api/donaciones/{id}` | La donación |
| Anular (solo `admin`) | `POST /api/donaciones/{id}/anular` | La donación |
| Convertir un ítem en equipo (solo `admin`) | `POST /api/donaciones/{id}/items/{itemId}/equipo` | 201 con el equipo completo |
| Subir o reemplazar el comprobante (solo `admin`) | `PUT /api/donaciones/{id}/comprobante` | La donación, con `receipt` actualizado |
| Ver el comprobante | `GET /api/donaciones/{id}/comprobante` | La imagen en WebP |
| Quitar el comprobante (solo `admin`) | `DELETE /api/donaciones/{id}/comprobante` | 204 |
| Exportar a Excel | `GET /api/donaciones/export.xlsx` | El archivo |

Las donaciones no se borran: se anulan.

### La donación

```json
{
  "id": "4033a684-48b1-45ac-a68f-aa600245baf6",
  "donorId": "f39bb7fe-595b-48e4-a7b5-35ecae8e3bdf",
  "donorName": "Empresa Aliada SAS",
  "sede": "Altos del Cabo",
  "donationDate": "2026-11-05",
  "notes": "Entrega en sede",
  "status": "recibida",
  "receipt": "",
  "items": [
    {
      "id": "6d239ec6-acab-4401-931c-81f93e11fe63",
      "name": "Tablet Samsung",
      "categoryId": null,
      "categoryName": "",
      "quantity": 1,
      "condition": "usado",
      "estimatedUnitValue": 400000,
      "description": "",
      "assetId": null
    },
    {
      "id": "5b217e26-d439-4715-8966-1bc8a62d0b50",
      "name": "Sillas",
      "categoryId": "48d4d524-8e1e-4dad-8e61-3d9eaf39f678",
      "categoryName": "Sillas",
      "quantity": 4,
      "condition": "nuevo",
      "estimatedUnitValue": 50000,
      "description": "Plásticas blancas",
      "assetId": null
    }
  ],
  "totalEstimated": 600000,
  "createdAt": "2026-11-10T20:40:51.980079Z",
  "updatedAt": "2026-11-10T20:40:51.980079Z"
}
```

- `sede` es el **nombre** de la sede, como en equipos.
- `status` es `recibida` o `anulada`.
- `receipt` es la dirección del comprobante, o `""` si no tiene.
- `totalEstimated` lo calcula el servidor: la suma de `quantity × estimatedUnitValue`. Los ítems sin valor no suman. No se envía.
- `assetId` es el id del equipo en que se convirtió el ítem, o `null`.
- La lista trae cada donación completa, con sus ítems y su total.

### Crear

| Campo | Notas |
|---|---|
| `donorId` | Obligatorio. Id de un donante activo |
| `sede` | Obligatorio. Nombre o id |
| `donationDate` | Si falta o va vacía, hoy. No puede ser futura |
| `notes` | Opcional |
| `items` | Obligatorio. Entre 1 y 200 ítems |

Cada ítem:

| Campo | Notas |
|---|---|
| `name` | Obligatorio |
| `categoryId` | Id de una categoría existente. Opcional |
| `newCategory` | Nombre de una categoría nueva, que se crea al guardar. Si ya existe una con ese nombre, se usa esa |
| `quantity` | Entero de 1 en adelante. 1 por defecto |
| `condition` | `nuevo` (por defecto), `usado` o `danado` |
| `estimatedUnitValue` | Valor por unidad en pesos, entero de 0 en adelante. Opcional (`null`) |
| `description` | Opcional |

Se envía `categoryId` o `newCategory`, no los dos (422). Sin ninguno, el ítem queda sin categoría.

```js
const donacion = await api('/api/donaciones', {
  method: 'POST',
  body: {
    donorId: donante.id,
    sede: 'Altos del Cabo',
    donationDate: '2026-11-05',
    notes: 'Entrega en sede',
    items: [
      { name: 'Tablet Samsung', quantity: 1, condition: 'usado', estimatedUnitValue: 400000 },
      { name: 'Ollas', newCategory: 'Menaje de cocina', quantity: 3 }
    ]
  }
});
```

### Filtros

| Parámetro | Efecto |
|---|---|
| `desde`, `hasta` | Rango de `donationDate`, los dos incluidos. `desde` posterior a `hasta` responde 422 |
| `donante` | Id del donante |
| `sede` | Nombre o id |
| `estado` | `recibida` o `anulada` |
| `categoria` | Id o nombre de la categoría: donaciones con al menos un ítem de esa categoría |
| `q` | Texto en el nombre o la descripción de los ítems |

`categoria` y `q` deben coincidir en el **mismo** ítem. Una donación con varios ítems que coinciden sale una sola vez. Se pagina con `limit` y `offset`, como todas las listas.

```js
const filtros = new URLSearchParams({ desde: '2026-11-01', estado: 'recibida', q: 'silla' });
const { items, total } = await api(`/api/donaciones?${filtros}&limit=20&offset=0`);
```

### Cambiar

`PATCH` acepta `donorId`, `sede`, `donationDate`, `notes` e `items`. Solo cambia lo que se envía; `donorId`, `sede`, `donationDate` e `items` no pueden ir en `null`.

Si viene `items`, **reemplaza la lista completa**:

- Un ítem con `id` actualiza ese ítem.
- Un ítem sin `id` se crea.
- Los ítems que no vengan se quitan.
- Un `id` que no es de esa donación responde 422.

Un ítem convertido en equipo (`assetId` distinto de `null`) queda bloqueado: hay que reenviarlo con su `id` y **sin cambios** en `name`, categoría, `quantity`, `condition`, `estimatedUnitValue` ni `description`. Si cambia algo o se omite, responde 409. Lo más simple es reenviarlo tal como llegó en el `GET`:

```js
const items = donacion.items.map(i => i.assetId
  ? { id: i.id, name: i.name, categoryId: i.categoryId || '', quantity: i.quantity,
      condition: i.condition, estimatedUnitValue: i.estimatedUnitValue, description: i.description }
  : { ...camposDelFormulario(i), id: i.id });

await api(`/api/donaciones/${donacion.id}`, { method: 'PATCH', body: { notes: 'Corregido', items } });
```

En el cuerpo del `PATCH` los ítems solo aceptan `id`, `name`, `categoryId`, `newCategory`, `quantity`, `condition`, `estimatedUnitValue` y `description`. Hay que quitar `categoryName` y `assetId` antes de reenviarlos (422 si no).

### Anular

`POST /api/donaciones/{id}/anular`, sin cuerpo. Una donación anulada es **de solo lectura**: cambiarla, volver a anularla, subir o quitar su comprobante o convertir sus ítems responde 409. Sigue saliendo en la lista y en el Excel; para ocultarla se filtra con `estado=recibida`.

### Comprobante

Igual que las fotos de los equipos (sección 14): una imagen por donación, el cuerpo del `PUT` es el archivo tal cual.

```js
const archivo = document.getElementById('donation-receipt-file').files[0];
const res = await fetch(`/api/donaciones/${id}/comprobante`, {
  method: 'PUT',
  headers: { 'Content-Type': archivo.type },
  body: archivo
});
const donacion = await res.json();
```

- Formatos: JPEG, PNG y WebP (422 si no es una imagen). Máximo 10 MB (413). Sin PDF.
- El servidor la reduce a 1280 px de lado como máximo y la guarda en WebP.
- `receipt` vale `/api/donaciones/{id}/comprobante?v=...` y sirve directamente como `src` de un `<img>` o como enlace para abrirla. Cambia cada vez que se reemplaza.
- `GET` del comprobante responde 404 si la donación no tiene uno.

### Convertir un ítem en equipo

Un ítem de cantidad 1 de una donación `recibida` se puede convertir en un equipo del inventario. El cuerpo es el mismo de `POST /api/equipos` (sección 8): `code` (la placa) es obligatorio y el resto es opcional. Si no se envía `sede`, el equipo queda en la sede de la donación.

```js
const equipo = await api(`/api/donaciones/${donacionId}/items/${itemId}/equipo`, {
  method: 'POST',
  body: { code: 'FND-TAB-001', computerType: 'TABLET', brand: 'Samsung', status: 'bodega' }
});
// Después, el ítem trae assetId === equipo.id.
```

- Responde 201 con el equipo completo, igual que `GET /api/equipos/{id}`.
- Solo ítems de cantidad 1 (409). Para convertir varias unidades, se registran como ítems separados de cantidad 1, cada uno con su placa.
- Un ítem ya convertido no se convierte otra vez (409).
- La placa no se repite (409), igual que al crear un equipo.
- Un ítem que no es de esa donación responde 404.

### Exportar a Excel

`GET /api/donaciones/export.xlsx` acepta los mismos filtros que la lista y trae todas las donaciones que coincidan, sin paginar. El libro tiene dos hojas: una con las donaciones (fecha, donante, sede, estado, ítems, unidades, total estimado y notas) y otra con cada ítem. Los usuarios `consulta` también pueden descargarlo.

```js
const filtros = new URLSearchParams({ desde: '2026-11-01', hasta: '2026-11-30', estado: 'recibida' });
window.location.href = `/api/donaciones/export.xlsx?${filtros}`;
```

### Errores

| Código | Cuándo |
|---|---|
| 403 | Un usuario `consulta` intenta crear, cambiar, anular, convertir o tocar el comprobante |
| 404 | La donación no existe, el ítem no es de esa donación (al convertir) o no hay comprobante |
| 409 | El donante está inactivo; la donación está anulada; el ítem convertido se cambia o se omite en el `PATCH`; el ítem ya se convirtió o su cantidad no es 1; la placa ya existe |
| 413 | El comprobante pasa de 10 MB |
| 422 | Falta un campo obligatorio; `items` vacío; fecha futura; `categoryId` y `newCategory` juntos; donante, categoría o ítem inexistentes; `desde` posterior a `hasta`; el comprobante no es JPEG, PNG ni WebP |

Los 422 de las reglas propias traen `loc` con el nombre del campo de la API (`donorId`, `donationDate`, `categoryId`, `items`, `desde`), con la misma forma que los de validación:

```json
{ "detail": [{ "type": "value_error", "loc": ["body", "donationDate"], "msg": "La fecha de la donación no puede ser futura" }] }
```

### En el frontend

La sección **Donaciones** de `frontend/` (`js/donaciones.js`) ya usa todas estas rutas. Es mínima a propósito, solo para mostrar el backend:

- [x] Lista con filtros (desde, hasta, donante, sede, estado, categoría y texto), paginación de 20 en 20 y el total estimado de cada donación.
- [x] Resumen del mes con `donationsThisMonth` e `itemsReceivedThisMonth` del panel.
- [x] Formulario para crear y editar, con ítems de categoría existente o nueva y el total calculado mientras se escribe. Los ítems convertidos se muestran bloqueados y se reenvían sin cambios.
- [x] Detalle con los ítems, el comprobante (subir, ver y quitar), la conversión de un ítem en equipo y el botón de anular.
- [x] Botón de exportar a Excel con los filtros activos.
- [x] Pestañas de donantes (crear, editar, activar o desactivar y ver su historial) y de categorías (crear, renombrar, activar o desactivar y borrar).
- [x] Con el rol `consulta` se ocultan las acciones de escritura y una donación anulada se muestra de solo lectura.
