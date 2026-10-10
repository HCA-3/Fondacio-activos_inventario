"""Lectura y cambio de la configuración global."""

from sqlalchemy.orm import Session

from app.models import Configuracion, Usuario
from app.schemas.configuracion import ConfiguracionCambios
from app.services.auditoria import registrar

CLAVES = {"theme_config": "themeConfig", "settings": "settings"}


def leer_configuracion(bd: Session) -> dict[str, dict[str, str]]:
    return {
        campo: (fila.valor if (fila := bd.get(Configuracion, clave)) else {})
        for campo, clave in CLAVES.items()
    }


def cambiar_configuracion(
    bd: Session, datos: ConfiguracionCambios, autor: Usuario
) -> dict[str, dict[str, str]]:
    """Mezcla los valores nuevos con los guardados: lo que no viene se conserva."""
    for campo, clave in CLAVES.items():
        nuevos = getattr(datos, campo)
        if nuevos is None:
            continue
        fila = bd.get(Configuracion, clave)
        if fila is None:
            fila = Configuracion(clave=clave, valor={})
            bd.add(fila)
        mezcla = {**fila.valor, **nuevos}
        if mezcla != fila.valor:
            fila.valor = mezcla
            fila.actualizado_por = autor.id
            registrar(bd, autor, "actualizar", "configuracion", clave, {"campos": sorted(nuevos)})
    bd.flush()
    return leer_configuracion(bd)
