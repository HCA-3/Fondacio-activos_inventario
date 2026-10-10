"""Esquemas de mantenimientos."""

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import Field

from app.models.mantenimiento import EstadoMantenimiento, TipoMantenimiento
from app.schemas.base import Entrada, Salida
from app.schemas.comunes import FechaOpcional, NoNulo, Texto, TextoLargo, TextoObligatorio

COLUMNAS = {
    "asset_name": "equipo_nombre",
    "type": "tipo",
    "request_date": "fecha_solicitud",
    "scheduled_date": "fecha_programada",
    "technician": "tecnico",
    "cost": "costo",
    "description": "descripcion",
    "replaced_parts": "repuestos",
    "next_scheduled_maintenance": "proximo",
    "notes": "notas",
}

Costo = Annotated[float, Field(ge=0)]
EstadoAlCompletar = Literal["operativo", "bodega", "baja"]


class MantenimientoNuevo(Entrada):
    asset_id: TextoObligatorio
    asset_code: Texto = ""
    asset_name: Texto = ""
    type: TipoMantenimiento
    status: EstadoMantenimiento = EstadoMantenimiento.PROGRAMADO
    request_date: FechaOpcional = None
    scheduled_date: FechaOpcional = None
    completion_date: FechaOpcional = None
    technician: Texto = ""
    cost: Costo = 0
    description: TextoLargo = ""
    replaced_parts: TextoLargo = ""
    next_scheduled_maintenance: FechaOpcional = None
    notes: TextoLargo = ""


class MantenimientoCambios(Entrada):
    asset_name: Texto = ""
    type: Annotated[TipoMantenimiento | None, NoNulo] = None
    status: Annotated[EstadoMantenimiento | None, NoNulo] = None
    request_date: Annotated[date | None, NoNulo] = None
    scheduled_date: FechaOpcional = None
    technician: Texto = ""
    cost: Annotated[Costo | None, NoNulo] = None
    description: TextoLargo = ""
    replaced_parts: TextoLargo = ""
    next_scheduled_maintenance: FechaOpcional = None
    notes: TextoLargo = ""


class Cierre(Entrada):
    notes: TextoLargo = ""
    new_asset_status: EstadoAlCompletar = "operativo"


class MantenimientoSalida(Salida):
    id: str
    asset_id: str = Field(validation_alias="equipo_id")
    asset_code: str = Field(validation_alias="equipo_placa")
    asset_name: str = Field(validation_alias="equipo_nombre")
    type: TipoMantenimiento = Field(validation_alias="tipo")
    status: EstadoMantenimiento = Field(validation_alias="estado")
    request_date: date = Field(validation_alias="fecha_solicitud")
    scheduled_date: date | None = Field(validation_alias="fecha_programada")
    completion_date: date | None = Field(validation_alias="fecha_realizado")
    technician: str = Field(validation_alias="tecnico")
    cost: float = Field(validation_alias="costo")
    description: str = Field(validation_alias="descripcion")
    replaced_parts: str = Field(validation_alias="repuestos")
    next_scheduled_maintenance: date | None = Field(validation_alias="proximo")
    notes: str = Field(validation_alias="notas")
    created_at: datetime = Field(validation_alias="creado_en")
    updated_at: datetime = Field(validation_alias="actualizado_en")
