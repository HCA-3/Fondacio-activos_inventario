"""Ayudas compartidas por los servicios."""

from datetime import date
from typing import Any

from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.errores import DatoInvalido
from app.models import Sede, Usuario


def _para_json(valor: Any) -> Any:
    return valor.isoformat() if isinstance(valor, date) else valor


def valores(datos: BaseModel, columnas: dict[str, str]) -> dict[str, Any]:
    """Valores del cuerpo listos para crear el registro, con los nombres de las columnas."""
    return {columna: getattr(datos, campo) for campo, columna in columnas.items()}


def aplicar_cambios(objeto: Any, datos: BaseModel, columnas: dict[str, str]) -> dict[str, list]:
    """Copia al registro los campos que vinieron en el cuerpo y devuelve qué cambió."""
    cambios = {}
    for campo in datos.model_fields_set:
        columna = columnas.get(campo)
        if columna is None:
            continue
        nuevo, viejo = getattr(datos, campo), getattr(objeto, columna)
        if nuevo != viejo:
            cambios[columna] = [_para_json(viejo), _para_json(nuevo)]
            setattr(objeto, columna, nuevo)
    return cambios


def marcar_autor(objeto: Any, autor: Usuario | None, *, nuevo: bool = False) -> None:
    quien = autor.id if autor else None
    if nuevo:
        objeto.creado_por = quien
    objeto.actualizado_por = quien


def resolver_sede(bd: Session, referencia: str, campo: str = "sede") -> Sede:
    """Busca la sede por id o por nombre, que es como la identifica el frontend."""
    sede = bd.scalar(
        select(Sede).where(
            or_(Sede.id == referencia, func.lower(Sede.nombre) == referencia.lower())
        )
    )
    if sede is None:
        raise DatoInvalido(campo, f"No existe la sede {referencia!r}")
    return sede
