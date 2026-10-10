"""Paginación común a todas las listas."""

from typing import Annotated, Any

from fastapi import Depends, Query
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session


class Paginacion:
    def __init__(
        self,
        limit: Annotated[int, Query(ge=1, le=500)] = 100,
        offset: Annotated[int, Query(ge=0)] = 0,
    ) -> None:
        self.limit = limit
        self.offset = offset


Pag = Annotated[Paginacion, Depends()]


def paginar(bd: Session, consulta: Select, pag: Paginacion) -> dict[str, Any]:
    """Ejecuta la consulta y devuelve la página pedida con el total de coincidencias."""
    total = bd.scalar(select(func.count()).select_from(consulta.order_by(None).subquery()))
    items = bd.scalars(consulta.limit(pag.limit).offset(pag.offset)).all()
    return {"items": items, "total": total, "limit": pag.limit, "offset": pag.offset}
