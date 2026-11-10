"""Esquemas de categorías."""

from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, Field

from app.schemas.base import Entrada, Salida
from app.schemas.comunes import NoNulo, TextoObligatorio


def _un_solo_espacio(valor: str) -> str:
    return " ".join(valor.split())


# "  Sillas   de  oficina " y "sillas de oficina" son la misma categoría.
NombreCategoria = Annotated[TextoObligatorio, AfterValidator(_un_solo_espacio)]

COLUMNAS = {"name": "nombre", "active": "activa"}


class CategoriaNueva(Entrada):
    name: NombreCategoria
    active: bool = True


class CategoriaCambios(Entrada):
    name: Annotated[NombreCategoria | None, NoNulo] = None
    active: Annotated[bool | None, NoNulo] = None


class CategoriaSalida(Salida):
    id: str
    name: str = Field(validation_alias="nombre")
    active: bool = Field(validation_alias="activa")
    created_at: datetime = Field(validation_alias="creado_en")
    updated_at: datetime = Field(validation_alias="actualizado_en")
