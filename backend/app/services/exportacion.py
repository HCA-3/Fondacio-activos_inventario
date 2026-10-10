"""Excel del inventario, con las mismas hojas y columnas que generaba el frontend."""

from collections.abc import Callable, Iterable
from io import BytesIO
from typing import Any

from openpyxl import Workbook
from openpyxl.cell import WriteOnlyCell
from openpyxl.worksheet.worksheet import Worksheet

from app.models import Equipo
from app.schemas.equipo import EquipoDetalle

Fila = dict[str, Any]
Columna = tuple[str, Callable[[Fila], Any]]


def _v(*claves: str, defecto: Any = "") -> Callable[[Fila], Any]:
    """El primer campo que tenga valor; si ninguno lo tiene, el valor por defecto."""

    def leer(equipo: Fila) -> Any:
        for clave in claves:
            if equipo.get(clave) not in (None, ""):
                return equipo[clave]
        return defecto

    return leer


def _fijo(texto: str) -> Callable[[Fila], Any]:
    return lambda _: texto


def _es_tablet(equipo: Fila) -> bool:
    return equipo.get("category") == "tablet" or equipo["code"].startswith("TAB")


def _disco(equipo: Fila) -> str:
    capacidad_y_tipo = f"{_v('disk1Capacity')(equipo)} {_v('disk1Tech')(equipo)}".strip()
    return _v("disk1Model", defecto=capacidad_y_tipo)(equipo)


def _ip_y_red(equipo: Fila) -> str:
    return f"{_v('ip')(equipo)} ({_v('wifiSSID', defecto='ALTINET FONDACIO')(equipo)})"


CENSO: list[Columna] = [
    ("ID Equipo", _v("code")),
    (
        "Tipo Dispositivo",
        lambda e: (
            "Tablet" if e.get("category") == "tablet" else _v("computerType", defecto="Portátil")(e)
        ),
    ),
    ("Marca / Fabricante", _v("brand")),
    ("Modelo", _v("model")),
    ("Nombre del Equipo", _v("networkHostname", "model")),
    ("Cuenta / Usuario", _v("assignedTo")),
    ("Sistema Operativo", _v("os")),
    ("Versión / Edición", _v("osBuild", "os")),
    ("Estado Licencia", _v("licenseState", defecto="Activa")),
    ("Procesador (CPU)", _v("processor")),
    ("RAM Instalada", _v("ram")),
    ("Almacenamiento (Disco)", _disco),
    ("Tarjeta Gráfica (GPU)", _v("gpu", defecto="GPU Integrada")),
    ("Dirección IP (Red)", _ip_y_red),
    (
        "Estado Operativo / Mantenimiento",
        _v("maintenanceAction", "recommendations", defecto="Operativo"),
    ),
]

HARDWARE: list[Columna] = [
    ("ID Equipo", _v("code")),
    ("Nombre Host", _v("networkHostname")),
    ("Marca y Modelo", lambda e: f"{_v('brand')(e)} {_v('model')(e)}".strip()),
    ("ID Dispositivo (UUID)", _v("uuid", defecto="N/A")),
    ("ID del Producto", _v("productId", "serial")),
    ("Procesador (CPU)", _v("processor")),
    ("Núcleos / Hilos", _v("cpuCores", defecto="N/A")),
    ("Velocidad Base", _v("cpuSpeed", defecto="N/A")),
    ("Caché CPU", _v("cpuCache", defecto="N/A")),
    ("Virtualización", _v("virtualization", defecto="Habilitada")),
    ("RAM Total", _v("ram")),
    ("RAM Utilizable", _v("ramUsable", "ram")),
    ("Velocidad RAM", _v("ramSpeed", defecto="N/A")),
    ("Ranuras RAM", _v("ramSlots", defecto="N/A")),
    ("Tipo Módulo", _v("ramType", defecto="SODIMM DDR4")),
    ("RAM Reservada Hardware", _v("ramHardwareReserved", defecto="N/A")),
    ("Modelo Almacenamiento (SSD)", _v("disk1Model", "disk1Brand")),
    ("Tipo / Interfaz", _v("disk1Tech")),
    ("Capacidad Nominal", _v("disk1Capacity")),
    ("Capacidad Formateada", _v("diskFormatted", "disk1Capacity")),
    ("Espacio Usado", _v("diskUsed", defecto="N/A")),
    ("Espacio Disponible", _v("diskFree", defecto="N/A")),
    ("% Uso Disco", _v("diskUsagePct", defecto="N/A")),
    ("Modelo Gráfico (GPU)", _v("gpu")),
    ("VRAM Dedicada", _v("vramDedicated", defecto="128 MB")),
    ("Memoria GPU Compartida", _v("gpuSharedMemory", defecto="N/A")),
    ("Versión Controlador", _v("gpuDriver", defecto="N/A")),
    ("DirectX", _v("directx", defecto="DirectX 12")),
    ("Tarjeta de Red Wi-Fi", _v("networkCardBrand")),
    ("Red SSID", _v("wifiSSID", defecto="ALTINET FONDACIO")),
    ("Dirección IPv4", _v("ip")),
    ("Dirección IPv6", _v("ipv6", defecto="N/A")),
]

SOFTWARE: list[Columna] = [
    ("ID Equipo", _v("code")),
    ("Nombre Host", _v("networkHostname")),
    ("Sistema Operativo", _v("os")),
    ("Versión / Build", _v("osBuild", defecto="22H2")),
    ("Fecha Instalación", _v("osInstallDate", "purchaseDate")),
    ("Estado de Activación", _v("licenseState", defecto="Activado")),
    ("Tipo de Licencia", _v("licenseType", defecto="Licencia Digital")),
    ("Clave Parcial", _v("licenseKeyPartial", defecto="Vinculada a Hardware")),
    ("Errores / Alertas de Licencia", _v("licenseAlerts", defecto="Ninguno")),
    ("Estado Windows Update", _v("windowsUpdateStatus", defecto="Al día en parches")),
    ("Antivirus / Seguridad", _v("securityStatus", defecto="Microsoft Defender Activo")),
    ("Configuración de Inicio (Apps Desactivadas)", _v("startupConfig", defecto="Optimizado")),
    (
        "Software y Herramientas Instaladas",
        _v("installedSoftware", defecto="Ofimática y Utilidades"),
    ),
    (
        "Acciones de Mantenimiento Ejecutadas / Recomendadas",
        _v("maintenanceAction", "recommendations"),
    ),
]

TABLETS: list[Columna] = [
    ("ID Dispositivo", _v("code")),
    ("Nombre / Etiqueta", _v("model")),
    ("Tipo", _fijo("Tablet Educativa / Apoyo")),
    ("Sistema Operativo", _v("os")),
    ("Versión Android", _v("osBuild", defecto="5.0 (Lollipop)")),
    ("Entorno de Trabajo", _fijo("Nube / Colaborativo")),
    ("Cuenta Institucional Vinculada", _fijo("Cuenta Institucional Google Fondacio")),
    ("Acceso a Google Drive", _fijo("Acceso directo web en pantalla principal")),
    ("Estado de Obsolescencia", _fijo("Obsolescencia por fin de ciclo Android 5.0")),
    (
        "Estrategia de Mitigación Aplicada",
        _v(
            "obsolescenceStrategy",
            defecto="Evasión de dependencias de Google Play mediante accesos web directos a "
            "Google Workspace (Drive, Docs, Sheets)",
        ),
    ),
    (
        "Uso Destinado en Fondacio",
        _v(
            "recommendations",
            defecto="Talleres pedagógicos, lectura comunitaria, consulta web y actividades de "
            "aula de apoyo",
        ),
    ),
]


def _celda(hoja: Worksheet, valor: Any) -> Any:
    if isinstance(valor, str) and valor.startswith("="):
        # Sin esto Excel ejecutaría como fórmula un texto escrito por un usuario.
        celda = WriteOnlyCell(hoja, value=valor)
        celda.data_type = "s"
        return celda
    return valor


def _hoja(libro: Workbook, titulo: str, columnas: list[Columna], filas: Iterable[Fila]) -> None:
    hoja = libro.create_sheet(titulo)
    hoja.append([encabezado for encabezado, _ in columnas])
    for fila in filas:
        hoja.append([_celda(hoja, leer(fila)) for _, leer in columnas])


def generar_excel(equipos: Iterable[Equipo]) -> bytes:
    filas = [
        EquipoDetalle.model_validate(equipo).model_dump(mode="json", by_alias=True)
        for equipo in equipos
    ]
    computadores = [fila for fila in filas if not _es_tablet(fila)]
    tablets = [fila for fila in filas if _es_tablet(fila)]

    libro = Workbook(write_only=True)
    _hoja(libro, "Censo General de Equipos", CENSO, filas)
    # Igual que antes: las hojas de detalle solo aparecen si tienen equipos.
    if computadores:
        _hoja(libro, "Detalle Hardware PCs", HARDWARE, computadores)
        _hoja(libro, "Software y Mantenimiento", SOFTWARE, computadores)
    if tablets:
        _hoja(libro, "Dispositivos Móviles (Tablets)", TABLETS, tablets)

    salida = BytesIO()
    libro.save(salida)
    return salida.getvalue()
