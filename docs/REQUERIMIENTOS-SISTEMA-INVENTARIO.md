# Especificación de Requerimientos Funcionales y No Funcionales (SRS)
**Sistema de Gestión de Inventario, Hojas de Vida y Activos Tecnológicos**

* **Organización:** Fundación Fondacio Colombia (Sedes Potosí, Altos del Cabo y Administrativa)
* **Tipo de Documento:** Especificación Técnica de Requerimientos de Software (SRS / ERS)
* **Versión del Sistema:** 2.0 (Arquitectura FastAPI + PostgreSQL + SPA)
* **Estado:** Vigente y Validado en Producción | Octubre de 2026

---

## 1. Introducción y Alcance del Sistema
El presente documento detalla la totalidad de los requerimientos funcionales (RF) y requerimientos no funcionales (RNF) que rigen el funcionamiento del Sistema de Inventario de Activos de Hardware de la **Fundación Fondacio Colombia**. El sistema tiene como propósito centralizar, auditar, proteger y gestionar el ciclo de vida completo de los recursos informáticos utilizados en las sedes de formación juvenil, ecología y gestión administrativa.

### 1.1. Actores del Sistema
* **Administrador Principal (`admin`):** Usuario con privilegios absolutos sobre el sistema. Es el único actor autorizado para registrar nuevas cuentas de usuario, configurar ajustes globales y supervisar auditorías.
* **Administrador Secundario (Rol `admin`):** Usuarios con facultades de creación, modificación y eliminación sobre el inventario, sedes, préstamos, actas y mantenimientos, pero sin autorización para crear más usuarios.
* **Usuario de Consulta (Rol `consulta`):** Usuarios de consulta institucional (voluntarios, auditores, personal asistencial). Tienen acceso de solo lectura y pueden descargar reportes en Excel.
* **Custodios / Beneficiarios Externos:** Jóvenes estudiantes, docentes o aliados comunitarios a quienes se les entregan equipos en comodato o préstamo temporal bajo acta oficial.

---

## 2. Requerimientos Funcionales (RF)

### 2.1. Módulo de Autenticación, Seguridad y Cuentas

| Código | Requerimiento | Descripción Detallada |
|---|---|---|
| **RF-01** | Autenticación de Usuarios | El sistema debe validar credenciales (usuario y contraseña) contra la base de datos central PostgreSQL utilizando el algoritmo de cifrado Argon2id. |
| **RF-02** | Gestión de Sesión HTTP-Only | El sistema debe autenticar las peticiones mediante una cookie de sesión segura (HTTP-only, SameSite=Lax) de 8 horas de vigencia sin exponer tokens en LocalStorage. |
| **RF-03** | Cierre de Sesión | El sistema debe permitir cerrar sesión revocando inmediatamente el token de sesión en la base de datos y limpiando la cookie del cliente. |
| **RF-04** | Protección contra Fuerza Bruta | El sistema debe bloquear temporalmente por 15 minutos al usuario que acumule 5 intentos fallidos consecutivos de inicio de sesión. |
| **RF-05** | Cambio de Contraseña de Cuenta Propia | Cualquier usuario autenticado debe poder actualizar su contraseña personal desde la sección de configuración (mínimo 8 caracteres). |
| **RF-06** | Restricción Exclusiva de Creación de Usuarios | Únicamente el usuario `admin` tiene autorización para crear nuevos usuarios en el sistema. Las solicitudes de creación por cualquier otro usuario deben ser rechazadas con código 403 Forbidden. |
| **RF-07** | Gestión y Desactivación de Usuarios | El usuario `admin` debe poder listar todos los usuarios del sistema, registrar nuevas cuentas asignando rol (`admin` o `consulta`) y activar o desactivar usuarios existentes. |

### 2.2. Módulo de Inventario de Hardware y Hojas de Vida

| Código | Requerimiento | Descripción Detallada |
|---|---|---|
| **RF-08** | Registro Completo de Ficha Técnica | El sistema debe permitir registrar y actualizar hojas de vida con marca, modelo, fecha de compra, proveedor/donante, valor estimado en COP y dependencia. |
| **RF-09** | Especificaciones de Hardware Detalladas | El sistema debe almacenar CPU con frecuencia, memoria RAM, GPU, hasta 2 unidades de disco (HDD, SSD SATA, NVMe M.2) con serial y modelo, y periféricos vinculados. |
| **RF-10** | Configuración de Red | El sistema debe capturar el nombre en red (hostname), dirección IP, dirección MAC, tipo de interfaz (cable, wifi, ambos, sin red), adaptador de red y dominio institucional. |
| **RF-11** | Ubicación Física y Custodia | El sistema debe asociar cada activo a una sede institucional, espacio físico/sala, dirección, usuario custodio asignado y estado operativo (operativo, bodega, prestado, mantenimiento, baja). |
| **RF-12** | Carga de Imágenes en Binario | El sistema debe permitir subir y almacenar la fotografía física del equipo en formato binario mediante `PUT /api/equipos/{id}/imagen`. |
| **RF-13** | Búsqueda y Filtros Combinados | El sistema debe ofrecer búsqueda en tiempo real por texto libre y filtrado dinámico por sede, categoría y estado operativo. |
| **RF-14** | Generador de Etiquetas con Código QR | El sistema debe generar etiquetas con código QR descargables e imprimibles basadas en la placa del inventario. |
| **RF-15** | Vista Dual (Tabla / Cuadrícula) | El sistema debe permitir alternar con un solo clic entre la vista de tabla tabular detallada y la vista de tarjetas visuales. |

### 2.3. Módulo de Sedes y Espacios Físicos

| Código | Requerimiento | Descripción Detallada |
|---|---|---|
| **RF-16** | Administración de Sedes | El sistema debe permitir el alta, modificación y eliminación de sedes con nombre, código/prefijo (POT, CABO, ADM), dirección, ciudad, teléfono, color distintivo y enfoque. |
| **RF-17** | Sincronización en Cascada de Sedes | Los cambios en sedes deben reflejarse de inmediato en todos los selectores de equipos, préstamos y filtros del sistema. |

### 2.4. Módulo de Préstamos y Actas Oficiales

| Código | Requerimiento | Descripción Detallada |
|---|---|---|
| **RF-18** | Registro de Préstamo | El sistema debe registrar préstamos de equipos disponibles asociando beneficiario, documento de identidad, rol, fechas pactadas y propósito. |
| **RF-19** | Cálculo de Atraso (Mora) | El sistema debe alertar en tiempo real los préstamos cuya fecha pactada de retorno haya expirado. |
| **RF-20** | Generación de Acta Oficial de Entrega | El sistema debe formatear e imprimir el Acta Formal de Entrega y Responsabilidad con membrete de Fondacio, especificaciones y firmas de entrega/recibido. |

### 2.5. Módulo de Mantenimientos y Diagnóstico

| Código | Requerimiento | Descripción Detallada |
|---|---|---|
| **RF-21** | Bitácora de Soporte Técnico | El sistema debe registrar órdenes de mantenimiento preventivo, correctivo o mejoras (RAM/SSD), costos, repuestos y fecha sugerida de próxima revisión. |
| **RF-22** | Auditoría de Sistemas Operativos y Tablets | El sistema debe calcular métricas de obsolescencia de software (32 vs 64 bits), activación de licencias y plan de mitigación de tablets. |

### 2.6. Módulo de Analítica y Reportes Oficiales

| Código | Requerimiento | Descripción Detallada |
|---|---|---|
| **RF-23** | Dashboard y Gráficos Estadísticos | El sistema debe graficar en tiempo real la distribución de equipos por sedes, categorías de hardware y balance patrimonial total en COP. |
| **RF-24** | Exportación Oficial a Excel en Servidor | El sistema debe entregar la descarga directa del libro de Excel oficial de 4 hojas (Resumen, Hojas de Vida, Préstamos, Mantenimientos) generado en el backend. |
| **RF-25** | Personalizador de Paleta Institucional | El sistema debe permitir previsualizar y guardar la combinación de colores institucional en la base de datos. |

---

## 3. Requerimientos No Funcionales (RNF)

| Código | Atributo de Calidad | Criterio de Aceptación |
|---|---|---|
| **RNF-01** | Seguridad y Criptografía | Las contraseñas deben cifrarse con el algoritmo **Argon2id** (Memory-hard). Las sesiones deben viajar en cookies con flags `HttpOnly` y `SameSite=Lax`. Se mitigan ataques de inyección SQL mediante el ORM SQLAlchemy y se sanitizan entradas contra XSS. |
| **RNF-02** | Rendimiento y Tiempo de Respuesta | Las peticiones de consulta indexadas a la API deben responder en menos de **150ms** bajo condiciones normales. La carga inicial de la aplicación SPA debe ser menor a 1.5 segundos. |
| **RNF-03** | Concurrencia e Integridad Transaccional | El sistema debe soportar acceso multiusuario concurrente desde las distintas sedes de Fondacio. Todas las operaciones de mutación deben ejecutarse bajo transacciones **ACID** en PostgreSQL. |
| **RNF-04** | Trazabilidad y Auditoría | Cada operación de creación, actualización o eliminación debe generar un registro inmutable en la tabla de auditoría, documentando `usuario_id`, entidad, `entidad_id`, fecha ISO y cambios en JSONB. |
| **RNF-05** | Usabilidad y Diseño Responsivo | La interfaz debe ser completamente adaptativa a dispositivos móviles (>=360px), tablets y escritorios. Debe incorporar modo claro y modo oscuro, además de atajos de teclado (`Ctrl+K`). |
| **RNF-06** | Portabilidad y Despliegue | La aplicación debe poder ejecutarse idénticamente en entornos locales y en la nube mediante contenedores Docker con variables de entorno declaradas en `compose.yaml`. |
