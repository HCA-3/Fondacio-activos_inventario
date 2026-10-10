# Guía para migrar el frontend a la API

Esta guía es para quienes mantienen `frontend/`. Explica cómo levantar el backend en tu máquina y cómo cambiar cada módulo para que deje de guardar en `localStorage` y use la API.

Se actualiza a medida que el backend crece. Lo que ya está disponible:

| Módulo | Estado |
|---|---|
| Sesión (login, logout, usuario actual) | Disponible |
| Usuarios | Disponible (solo administradores) |
| Sedes, equipos, préstamos, mantenimientos | Disponible |
| Configuración (tema y datos de la organización) | Disponible |
| Panel, exportación a Excel, fotos | Pendiente |

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
- No se borran usuarios: se desactivan con `{active: false}`. Eso cierra sus sesiones.
- Restablecer la contraseña también cierra las sesiones de ese usuario.
- Un administrador no puede desactivarse ni quitarse el rol a sí mismo (409).

No hay pantalla de usuarios todavía. Mientras tanto se gestionan desde `http://localhost:8000/docs`.

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
| `DB.getDashboardStats()` | Pendiente (`GET /api/dashboard`) |
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
- `image` es una ruta o URL de hasta 500 caracteres. No admite la imagen incrustada en base64; la subida de fotos está pendiente.

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

## 12. Lo que viene

- `GET /api/dashboard`: los totales del panel calculados en el servidor.
- `GET /api/equipos/export.xlsx`: el Excel generado por el servidor, con los mismos filtros de la lista.
- Subida de fotos de los equipos.
