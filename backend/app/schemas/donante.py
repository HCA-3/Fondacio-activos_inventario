"""Esquemas de donantes."""

from datetime import datetime
from typing import Annotated

from pydantic import Field

from app.models.donante import TipoDonante
from app.schemas.base import Entrada, Salida
from app.schemas.comunes import NoNulo, Texto, TextoLargo, TextoObligatorio

# Campo de la API -> columna de la tabla.
COLUMNAS = {
    "name": "nombre",
    "type": "tipo",
    "contact": "contacto",
    "notes": "notas",
    "active": "activo",
}


class DonanteNuevo(Entrada):
    name: TextoObligatorio
    type: TipoDonante = TipoDonante.PERSONA
    contact: Texto = ""
    notes: TextoLargo = ""
    active: bool = True


class DonanteCambios(Entrada):
    name: Annotated[TextoObligatorio | None, NoNulo] = None
    type: Annotated[TipoDonante | None, NoNulo] = None
    contact: Texto = ""
    notes: TextoLargo = ""
    active: Annotated[bool | None, NoNulo] = None


class DonanteSalida(Salida):
    id: str
    name: str = Field(validation_alias="nombre")
    type: TipoDonante = Field(validation_alias="tipo")
    contact: str = Field(validation_alias="contacto")
    notes: str = Field(validation_alias="notas")
    active: bool = Field(validation_alias="activo")
    created_at: datetime = Field(validation_alias="creado_en")
    updated_at: datetime = Field(validation_alias="actualizado_en")
