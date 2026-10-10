"""Escritura del registro de auditoría."""

from typing import Any

from sqlalchemy.orm import Session

from app.models import Auditoria, Usuario


def registrar(
    bd: Session,
    autor: Usuario | None,
    accion: str,
    entidad: str,
    entidad_id: str,
    cambios: dict[str, Any] | None = None,
) -> None:
    """Añade una fila a la auditoría dentro de la transacción en curso."""
    bd.add(
        Auditoria(
            usuario_id=autor.id if autor else None,
            accion=accion,
            entidad=entidad,
            entidad_id=entidad_id,
            cambios=cambios,
        )
    )
