"""Reglas de los donantes."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errores import Conflicto
from app.models import Donante, Usuario
from app.schemas.donante import COLUMNAS, DonanteCambios, DonanteNuevo
from app.services.auditoria import registrar
from app.services.comun import aplicar_cambios, marcar_autor, valores


def _exigir_nombre_libre(bd: Session, nombre: str, salvo: Donante | None = None) -> None:
    otro = bd.scalar(select(Donante).where(func.lower(Donante.nombre) == nombre.lower()))
    if otro is not None and otro is not salvo:
        raise Conflicto(f"Ya existe un donante llamado {otro.nombre!r}")


def crear_donante(bd: Session, datos: DonanteNuevo, autor: Usuario | None) -> Donante:
    _exigir_nombre_libre(bd, datos.name)
    donante = Donante(**valores(datos, COLUMNAS))
    marcar_autor(donante, autor, nuevo=True)
    bd.add(donante)
    bd.flush()
    registrar(bd, autor, "crear", "donantes", donante.id, {"nombre": donante.nombre})
    return donante


def actualizar_donante(
    bd: Session, donante: Donante, datos: DonanteCambios, autor: Usuario
) -> Donante:
    if datos.name is not None:
        _exigir_nombre_libre(bd, datos.name, salvo=donante)
    cambios = aplicar_cambios(donante, datos, COLUMNAS)
    if cambios:
        marcar_autor(donante, autor)
        registrar(bd, autor, "actualizar", "donantes", donante.id, cambios)
    return donante
