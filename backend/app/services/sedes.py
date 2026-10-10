"""Reglas de las sedes."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errores import Conflicto
from app.models import Equipo, Prestamo, Sede, Usuario
from app.schemas.sede import COLUMNAS, SedeCambios, SedeNueva
from app.services.auditoria import registrar
from app.services.comun import aplicar_cambios, marcar_autor, valores


def _exigir_nombre_libre(bd: Session, nombre: str, salvo: Sede | None = None) -> None:
    otra = bd.scalar(select(Sede).where(func.lower(Sede.nombre) == nombre.lower()))
    if otra is not None and otra is not salvo:
        raise Conflicto(f"Ya existe una sede llamada {otra.nombre!r}")


def crear_sede(bd: Session, datos: SedeNueva, autor: Usuario | None) -> Sede:
    _exigir_nombre_libre(bd, datos.name)
    sede = Sede(**valores(datos, COLUMNAS))
    marcar_autor(sede, autor, nuevo=True)
    bd.add(sede)
    bd.flush()
    registrar(bd, autor, "crear", "sedes", sede.id, {"nombre": sede.nombre})
    return sede


def actualizar_sede(bd: Session, sede: Sede, datos: SedeCambios, autor: Usuario) -> Sede:
    if datos.name is not None:
        _exigir_nombre_libre(bd, datos.name, salvo=sede)
    cambios = aplicar_cambios(sede, datos, COLUMNAS)
    if cambios:
        marcar_autor(sede, autor)
        registrar(bd, autor, "actualizar", "sedes", sede.id, cambios)
    return sede


def borrar_sede(bd: Session, sede: Sede, autor: Usuario) -> None:
    if bd.scalar(select(func.count()).select_from(Sede)) <= 1:
        raise Conflicto("Debe existir al menos una sede registrada")
    equipos = bd.scalar(select(func.count()).select_from(Equipo).where(Equipo.sede_id == sede.id))
    if equipos:
        raise Conflicto(
            f"La sede tiene {equipos} equipo(s). Muévelos a otra sede antes de borrarla"
        )
    if bd.scalar(select(Prestamo.id).where(Prestamo.sede_id == sede.id).limit(1)):
        raise Conflicto("La sede aparece en el historial de préstamos y no se puede borrar")
    registrar(bd, autor, "borrar", "sedes", sede.id, {"nombre": sede.nombre})
    bd.delete(sede)
