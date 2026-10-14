# Sistema de Inventario de Activos de Hardware - Fondacio Colombia

Sistema web moderno, ágil y autónomo para la gestión integral de activos tecnológicos, equipos de cómputo, redes y periféricos de la **Fundación Fondacio Colombia** ([fondaciocolombia.org](https://www.fondaciocolombia.org)).

**Aplicación en línea:** https://fondacio-inventario.onrender.com

Diseñado especialmente para el control y trazabilidad de los recursos en los dos proyectos y sedes principales:
- **Centro de Formación YLDC Potosí** (Ciudad Bolívar, Bogotá) - Aulas de informática y desarrollo juvenil.
- **Centro de Ecología Integral Altos del Cabo** (San Luis, Chapinero, Bogotá) - Gestión comunitaria y ambiental.
- **Sede Administrativa Nacional** - Gestión institucional y proyectos sociales.

---

## 🌟 Características Principales

### 1. 📊 Panel de Control y Analítica en Tiempo Real
- Conteo global de activos, porcentaje de operatividad y valor patrimonial estimado.
- Gráficos interactivos de distribución por **Sede** y por **Categoría de Hardware**.
- Alertas en tiempo real sobre préstamos vigentes y servicios de mantenimiento en curso.

### 2. 💻 Inventario de Hardware (CRUD Completo y Fichas Técnicas)
- **Registro técnico exhaustivo**: Procesador (CPU), Memoria RAM, Almacenamiento SSD/HDD, Gráficos (GPU), Sistema Operativo, Serial de Fábrica, Dirección MAC e IP.
- **Ubicación y Custodia**: Sede institucional, sala o espacio específico y responsable asignado.
- **Procedencia**: Identificación de donaciones (U. Católica, donantes internacionales, empresas aliadas) o compras directas.
- **Búsqueda instantánea y Filtros combinados** por sede, categoría, estado y origen.
- **Vista dual**: Alterna con un solo clic entre vista de **Tabla Detallada** y vista de **Tarjetas Visuales**.

### 3. 🏷️ Generador de Etiquetas de Activo con Código QR
- Generación automática de códigos QR por cada equipo con placa institucional (ej: `FND-POT-001`, `FND-CABO-001`).
- Vista optimizada de impresión de etiquetas adhesivas para pegarlas físicamente en los computadores y dispositivos.

### 4. 🤝 Gestión de Préstamos y Generación de Actas Oficiales
- Asignación de equipos a jóvenes estudiantes, voluntarios o docentes con control de fechas de entrega y devolución.
- **Acta Oficial de Entrega y Responsabilidad de Equipo**: Documento formal imprimible con encabezado institucional de Fondacio Colombia, detalle técnico, cláusula de custodia y espacios para firmas.

### 5. 🔧 Mantenimientos y Bitácora Técnica
- Programación y seguimiento de mantenimientos **preventivos**, **correctivos** y **mejoras de hardware** (upgrades de RAM/SSD).
- Control de costos de servicio, repuestos utilizados y fechas de próximas revisiones.

### 6. 📁 Exportación a Excel y Respaldo de Información
- **Exportar a Excel (XLSX)** con todas las columnas técnicas y administrativas en un solo clic.
- **Respaldo y Restauración en JSON** para guardar copias de seguridad de la base de datos o trasladarla entre equipos sin depender de un servidor externo.
- **Modo Claro / Modo Oscuro** con diseño visual adaptado a la identidad de Fondacio Colombia.

---

## 🚀 Cómo Ejecutar la Aplicación

La aplicación opera bajo una arquitectura cliente-servidor completa: el backend en **FastAPI** sirve tanto los endpoints de la API REST (`/api/...`) como la aplicación SPA del frontend en la raíz (`/`).

### Ejecución con Docker (Recomendada)
Requiere Docker Desktop instalado:
```bash
docker compose up --build
```
1. Ingresa en tu navegador a: **`http://localhost:8000`**
2. La documentación interactiva Swagger de la API queda disponible en: `http://localhost:8000/docs`

---

## 🔐 Credenciales y Control de Acceso

Al inicializar la aplicación por primera vez en la base de datos, se crea automáticamente la cuenta de administración inicial:

* **Usuario:** `admin`
* **Contraseña:** `012345678`
* **Rol:** `admin` (Administrador Total)

### Reglas de Seguridad y Usuarios:
* **Exclusividad para crear usuarios:** Únicamente el usuario `admin` tiene autorización para crear y registrar nuevos usuarios en el sistema (`POST /api/usuarios`).
* **Roles del Sistema:**
  * **`admin`**: Control total (creación, edición, eliminación de hojas de vida, sedes, préstamos y mantenimientos).
  * **`consulta`**: Acceso de solo lectura y descarga de informes oficiales en Excel.
* **Cambio de Contraseña:** Cualquier usuario autenticado puede cambiar su contraseña personal directamente desde el panel **Base de Datos & Ajustes** (`POST /api/auth/contrasena`).

---

## 📂 Estructura del Proyecto

```
Fondacio-activos_inventario/
├── backend/                  # API REST en FastAPI + SQLAlchemy 2.0 (PostgreSQL)
│   ├── alembic/              # Historial declarativo de migraciones de base de datos
│   ├── app/                  # Lógica de la API: routers, schemas Pydantic, services y models
│   ├── scripts/              # Utilidades de terminal (crear_admin.py)
│   └── tests/                # Suite de pruebas automatizadas con pytest
├── compose.yaml              # Orquestación Docker: servicio app (FastAPI) + db (PostgreSQL 17)
├── Dockerfile                # Imagen unificada de producción (UV + Python 3.13-slim)
├── frontend/                 # Single Page Application (SPA)
│   ├── index.html            # Estructura de la aplicación, vistas y modales
│   ├── css/
│   │   └── styles.css        # Sistema de diseño institucional Fondacio y modo oscuro
│   ├── img/                  # Fotografías y presets de equipos de cómputo
│   └── js/
│       ├── data.js           # Capa de comunicación asíncrona con la API REST (DataStoreAPI)
│       ├── app.js            # Enrutador SPA, gestión de sesión, roles y eventos globales
│       ├── dashboard.js      # Métricas patrimoniales y gráficos analíticos (Chart.js)
│       ├── inventory.js      # Hojas de vida, imágenes binarias, QR y exportación Excel
│       ├── loans.js          # Préstamos de equipos y actas oficiales de entrega
│       ├── maintenance.js    # Mantenimientos y bitácora técnica de soporte
│       ├── sedes.js          # Administración de sedes institucionales
│       ├── diagnostico.js    # Auditoría de software, licencias y tablets
│       └── customizer.js     # Personalizador de colores y marca institucional
├── docs/                     # Documentación técnica oficial del proyecto
│   ├── GUIA-MIGRACION-FRONTEND.md             # Especificación técnica del contrato de la API
│   ├── INFORME-MIGRACION-FRONTEND.docx / .md   # Informe técnico de la migración realizada
│   ├── REQUERIMIENTOS-SISTEMA-INVENTARIO.docx / .md # Requerimientos Funcionales y No Funcionales (SRS)
│   └── ARQUITECTURA-SISTEMA-INVENTARIO.docx / .md # Documento de Arquitectura de Software (SAD)
└── README.md                 # Documentación general y guía de puesta en marcha
```

---

## 🌿 Identidad Institucional
- **Fundación Fondacio Colombia**
- **NIT:** 900.384.129-5
- **Web:** [fondaciocolombia.org](https://www.fondaciocolombia.org)
- **Bogotá D.C., Colombia**