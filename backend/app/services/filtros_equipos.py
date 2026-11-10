"""Filtros del listado de equipos. La exportación a Excel usa los mismos."""

from typing import Annotated

from fastapi import Query
from sqlalchemy import Select, func, or_, select

from app.models import Equipo, EstadoEquipo, Sede

# Dónde busca ?q=: las mismas columnas y campos de la ficha que revisaba el frontend.
COLUMNAS_DE_BUSQUEDA = (
    Equipo.placa,
    Equipo.marca,
    Equipo.modelo,
    Equipo.serial,
    Equipo.area,
    Equipo.responsable,
    Equipo.ubicacion,
)
CAMPOS_DE_FICHA_DE_BUSQUEDA = ("processor", "ip", "mac", "networkHostname", "os")

Filtro = Annotated[str | None, Query(max_length=100)]


def _patron(texto: str) -> str:
    seguro = texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{seguro}%"


class FiltrosDeEquipos:
    """Filtros de la lista. La exportación a Excel usa los mismos."""

    def __init__(
        self,
        sede: Filtro = None,
        estado: EstadoEquipo | None = None,
        categoria: Filtro = None,
        tipo: Filtro = None,
        q: Filtro = None,
    ) -> None:
        self.sede = sede
        self.estado = estado
        self.categoria = categoria
        self.tipo = tipo
        self.q = q.strip() if q else ""

    def consulta(self) -> Select:
        consulta = select(Equipo)
        if self.sede:
            consulta = consulta.join(Sede).where(
                or_(Sede.id == self.sede, func.lower(Sede.nombre) == self.sede.lower())
            )
        if self.estado:
            consulta = consulta.where(Equipo.estado == self.estado)
        if self.categoria:
            consulta = consulta.where(func.lower(Equipo.categoria) == self.categoria.lower())
        if self.tipo:
            consulta = consulta.where(func.lower(Equipo.tipo_equipo) == self.tipo.lower())
        if self.q:
            patron = _patron(self.q)
            consulta = consulta.where(
                or_(
                    *(columna.ilike(patron, escape="\\") for columna in COLUMNAS_DE_BUSQUEDA),
                    *(
                        Equipo.ficha_tecnica[campo].astext.ilike(patron, escape="\\")
                        for campo in CAMPOS_DE_FICHA_DE_BUSQUEDA
                    ),
                )
            )
        return consulta
