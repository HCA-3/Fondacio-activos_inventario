# Guía para migrar el frontend a la API

Esta guía es para quienes mantienen `frontend/`. Explica cómo levantar el backend en tu máquina y cómo cambiar cada módulo para que deje de guardar en `localStorage` y use la API.

Se actualiza a medida que el backend crece. Lo que ya está disponible:

| Módulo | Estado |
|---|---|
| Sesión (login, logout, usuario actual) | Disponible |
| Usuarios | Disponible (solo administradores) |
| Sedes, equipos, préstamos, mantenimientos | Pendiente |
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
- **Campos desconocidos se rechazan.** Si envías un campo que la ruta no espera, responde 422.

### Errores

Todos los errores traen un campo `detail`:

| Código | Significado | `detail` |
|---|---|---|
| 401 | No hay sesión o venció | Texto. Muestra la pantalla de login. |
| 403 | El rol no tiene permiso | Texto |
| 404 | El registro o la ruta no existe | Texto |
| 409 | La acción choca con el estado actual (por ejemplo, un nombre repetido) | Texto para mostrar al usuario |
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

## 6. Lo que viene

Cuando estén listos sedes, equipos, préstamos y mantenimientos, esta guía tendrá una sección por módulo con la tabla de equivalencias entre los métodos actuales de `DataStore` (`saveAsset`, `saveLoan`, `returnLoan`, …) y las rutas de la API.
