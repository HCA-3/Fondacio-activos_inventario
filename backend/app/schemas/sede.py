"""Esquemas de sedes."""

from datetime import datetime
from typing import Annotated

from pydantic import Field

from app.schemas.base import Entrada, Salida
from app.schemas.comunes import NoNulo, Texto, TextoLargo, TextoObligatorio

# Campo de la API -> columna de la tabla.
COLUMNAS = {
    "name": "nombre",
    "full_name": "nombre_completo",
    "code": "codigo",
    "address": "direccion",
    "city": "ciudad",
    "phone": "telefono",
    "email": "correo",
    "color": "color",
    "focus": "enfoque",
}


class SedeNueva(Entrada):
    name: TextoObligatorio
    full_name: Texto = ""
    code: Texto = ""
    address: Texto = ""
    city: Texto = ""
    phone: Texto = ""
    email: Texto = ""
    color: Texto = ""
    focus: TextoLargo = ""


class SedeCambios(Entrada):
    name: Annotated[TextoObligatorio | None, NoNulo] = None
    full_name: Texto = ""
    code: Texto = ""
    address: Texto = ""
    city: Texto = ""
    phone: Texto = ""
    email: Texto = ""
    color: Texto = ""
    focus: TextoLargo = ""


class SedeSalida(Salida):
    id: str
    name: str = Field(validation_alias="nombre")
    full_name: str = Field(validation_alias="nombre_completo")
    code: str = Field(validation_alias="codigo")
    address: str = Field(validation_alias="direccion")
    city: str = Field(validation_alias="ciudad")
    phone: str = Field(validation_alias="telefono")
    email: str = Field(validation_alias="correo")
    color: str
    focus: str = Field(validation_alias="enfoque")
    created_at: datetime = Field(validation_alias="creado_en")
    updated_at: datetime = Field(validation_alias="actualizado_en")
