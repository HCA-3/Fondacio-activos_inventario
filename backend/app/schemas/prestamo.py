"""Esquemas de préstamos."""

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import Field

from app.models.prestamo import EstadoPrestamo
from app.schemas.base import Entrada, Salida
from app.schemas.comunes import FechaOpcional, NoNulo, Texto, TextoLargo, TextoObligatorio

COLUMNAS = {
    "asset_name": "equipo_nombre",
    "borrower_name": "prestatario_nombre",
    "borrower_id": "prestatario_documento",
    "borrower_role": "prestatario_cargo",
    "borrower_email": "prestatario_correo",
    "borrower_phone": "prestatario_telefono",
    "purpose": "proposito",
    "loan_date": "fecha_prestamo",
    "expected_return_date": "fecha_devolucion_prevista",
    "condition_on_loan": "condicion_entrega",
}

EstadoAlDevolver = Literal["operativo", "bodega", "baja"]


class PrestamoNuevo(Entrada):
    asset_id: TextoObligatorio
    # El frontend los envía; la placa se ignora (manda la del equipo) y el nombre es opcional.
    asset_code: Texto = ""
    asset_name: Texto = ""
    borrower_name: TextoObligatorio
    borrower_id: Texto = ""
    borrower_role: Texto = ""
    borrower_email: Texto = ""
    borrower_phone: Texto = ""
    sede: Texto = ""
    purpose: TextoLargo = ""
    loan_date: FechaOpcional = None
    expected_return_date: FechaOpcional = None
    condition_on_loan: TextoLargo = ""


class PrestamoCambios(Entrada):
    asset_name: Texto = ""
    borrower_name: Annotated[TextoObligatorio | None, NoNulo] = None
    borrower_id: Texto = ""
    borrower_role: Texto = ""
    borrower_email: Texto = ""
    borrower_phone: Texto = ""
    sede: Texto = ""
    purpose: TextoLargo = ""
    loan_date: Annotated[date | None, NoNulo] = None
    expected_return_date: FechaOpcional = None
    condition_on_loan: TextoLargo = ""
    return_notes: TextoLargo = ""


class Devolucion(Entrada):
    return_notes: TextoLargo = ""
    new_asset_status: EstadoAlDevolver = "operativo"


class PrestamoSalida(Salida):
    id: str
    asset_id: str = Field(validation_alias="equipo_id")
    asset_code: str = Field(validation_alias="equipo_placa")
    asset_name: str = Field(validation_alias="equipo_nombre")
    borrower_name: str = Field(validation_alias="prestatario_nombre")
    borrower_id: str = Field(validation_alias="prestatario_documento")
    borrower_role: str = Field(validation_alias="prestatario_cargo")
    borrower_email: str = Field(validation_alias="prestatario_correo")
    borrower_phone: str = Field(validation_alias="prestatario_telefono")
    sede: str = Field(validation_alias="sede_nombre")
    purpose: str = Field(validation_alias="proposito")
    loan_date: date = Field(validation_alias="fecha_prestamo")
    expected_return_date: date | None = Field(validation_alias="fecha_devolucion_prevista")
    actual_return_date: date | None = Field(validation_alias="fecha_devolucion")
    status: EstadoPrestamo = Field(validation_alias="estado")
    overdue: bool = Field(validation_alias="vencido")
    condition_on_loan: str = Field(validation_alias="condicion_entrega")
    return_notes: str = Field(validation_alias="notas_devolucion")
    created_at: datetime = Field(validation_alias="creado_en")
    updated_at: datetime = Field(validation_alias="actualizado_en")
