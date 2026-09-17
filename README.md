# Sistema de Inventario de Activos de Hardware - Fondacio Colombia

Sistema web moderno, ágil y autónomo para la gestión integral de activos tecnológicos, equipos de cómputo, redes y periféricos de la **Fundación Fondacio Colombia** ([fondaciocolombia.org](https://www.fondaciocolombia.org)).

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

La aplicación es una Single Page Application (SPA) sin dependencias de compilación complejas. Para abrirla:

### Opción 1: Directamente en el Navegador
1. Haz doble clic en el archivo `index.html` o ábrelo con cualquier navegador moderno (Google Chrome, Microsoft Edge, Firefox, Safari).

### Opción 2: Con un Servidor Local Ligero (Recomendado)
Si tienes Node.js, Python o la extensión Live Server de VS Code / IDE:
```bash
# Con Python
python -m http.server 8080

# Con npx serve
npx serve .
```
Luego ingresa en tu navegador a: `http://localhost:8080` (o el puerto indicado).

---

## 📂 Estructura del Proyecto

```
Fondacio-activos_inventario/
├── index.html            # Estructura de la aplicación SPA, modales y plantillas
├── css/
│   └── styles.css        # Sistema de diseño institucional, temas y print CSS
├── js/
│   ├── data.js           # Capa de datos, base de datos local y catálogo inicial
│   ├── dashboard.js      # Métricas, analítica y gráficos interactivos (Chart.js)
│   ├── inventory.js      # CRUD de hardware, filtros, QR y exportación Excel
│   ├── loans.js          # Préstamos de equipos y generación de actas de entrega
│   ├── maintenance.js    # Mantenimientos y bitácora técnica
│   └── app.js            # Orquestador general, rutas SPA, tema y modales
└── README.md             # Documentación del sistema
```

---

## 🌿 Identidad Institucional
- **Fundación Fondacio Colombia**
- **NIT:** 900.384.129-5
- **Web:** [fondaciocolombia.org](https://www.fondaciocolombia.org)
- **Bogotá D.C., Colombia**