"""Esquemas de equipos.

Los campos de abajo son columnas. Cualquier otro campo que mande el frontend (procesador, RAM,
discos, red, licencias...) se guarda tal cual en la ficha técnica y se devuelve en el detalle.
"""

from datetime import date, datetime
from typing import Annotated, Any

from pydantic import (
    BeforeValidator,
    ConfigDict,
    Field,
    SerializerFunctionWrapHandler,
    model_serializer,
    model_validator,
)
from pydantic.alias_generators import to_camel

from app.models.equipo import EstadoEquipo
from app.schemas.base import Entrada, Salida
from app.schemas.comunes import (
    FechaOpcional,
    NoNulo,
    NumeroOpcional,
    Ruta,
    Texto,
    TextoObligatorio,
)

COLUMNAS = {
    "code": "placa",
    "category": "categoria",
    "computer_type": "tipo_equipo",
    "brand": "marca",
    "model": "modelo",
    "serial": "serial",
    "area": "area",
    "assigned_to": "responsable",
    "assigned_role": "cargo_responsable",
    "location": "ubicacion",
    "condition": "condicion",
    "estimated_value": "valor_estimado",
    "purchase_date": "fecha_compra",
    "image": "imagen",
}
# Campos que el frontend devuelve al guardar pero que decide el servidor.
IGNORADOS = {"id", "createdAt", "updatedAt", "sedeId"}
MAX_CAMPOS_FICHA = 150


def _placa(valor: Any) -> Any:
    return valor.strip().upper() if isinstance(valor, str) else valor


Placa = Annotated[str, BeforeValidator(_placa), Field(min_length=1, max_length=50)]


class _EquipoEntrada(Entrada):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="allow")

    @model_validator(mode="after")
    def _revisar_ficha(self) -> "_EquipoEntrada":
        ficha = self.ficha()
        if len(ficha) > MAX_CAMPOS_FICHA:
            raise ValueError(f"La ficha técnica admite hasta {MAX_CAMPOS_FICHA} campos")
        for clave, valor in ficha.items():
            if len(clave) > 60:
                raise ValueError(f"Nombre de campo demasiado largo: {clave[:60]}")
            if not isinstance(valor, str | int | float | bool | None):
                raise ValueError(f"El campo {clave} debe ser texto, número, booleano o null")
            if isinstance(valor, str) and len(valor) > 5000:
                raise ValueError(f"El campo {clave} supera los 5000 caracteres")
        return self

    def ficha(self) -> dict[str, Any]:
        """Campos libres de la ficha técnica que vinieron en el cuerpo."""
        return {k: v for k, v in (self.model_extra or {}).items() if k not in IGNORADOS}


class EquipoNuevo(_EquipoEntrada):
    code: Placa
    sede: TextoObligatorio
    status: EstadoEquipo = EstadoEquipo.OPERATIVO
    category: Texto = ""
    computer_type: Texto = ""
    brand: Texto = ""
    model: Texto = ""
    serial: Texto = ""
    area: Texto = ""
    assigned_to: Texto = ""
    assigned_role: Texto = ""
    location: Texto = ""
    condition: Texto = ""
    estimated_value: NumeroOpcional = None
    purchase_date: FechaOpcional = None
    image: Ruta = ""


class EquipoCambios(_EquipoEntrada):
    code: Annotated[Placa | None, NoNulo] = None
    sede: Annotated[TextoObligatorio | None, NoNulo] = None
    status: Annotated[EstadoEquipo | None, NoNulo] = None
    category: Texto = ""
    computer_type: Texto = ""
    brand: Texto = ""
    model: Texto = ""
    serial: Texto = ""
    area: Texto = ""
    assigned_to: Texto = ""
    assigned_role: Texto = ""
    location: Texto = ""
    condition: Texto = ""
    estimated_value: NumeroOpcional = None
    purchase_date: FechaOpcional = None
    image: Ruta = ""


class EquipoResumen(Salida):
    """Lo que trae cada equipo en la lista."""

    id: str
    code: str = Field(validation_alias="placa")
    sede: str = Field(validation_alias="sede_nombre")
    sede_id: str
    status: EstadoEquipo = Field(validation_alias="estado")
    category: str = Field(validation_alias="categoria")
    computer_type: str = Field(validation_alias="tipo_equipo")
    brand: str = Field(validation_alias="marca")
    model: str = Field(validation_alias="modelo")
    serial: str
    area: str
    assigned_to: str = Field(validation_alias="responsable")
    assigned_role: str = Field(validation_alias="cargo_responsable")
    location: str = Field(validation_alias="ubicacion")
    condition: str = Field(validation_alias="condicion")
    estimated_value: float | None = Field(validation_alias="valor_estimado")
    purchase_date: date | None = Field(validation_alias="fecha_compra")
    image: str = Field(validation_alias="imagen")
    created_at: datetime = Field(validation_alias="creado_en")
    updated_at: datetime = Field(validation_alias="actualizado_en")


class EquipoDetalle(EquipoResumen):
    """El equipo completo: el resumen más los campos de la ficha técnica, al mismo nivel."""

    ficha_tecnica: dict[str, Any] = Field(exclude=True)

    @model_serializer(mode="wrap")
    def _aplanar(self, serializar: SerializerFunctionWrapHandler) -> dict[str, Any]:
        return {**self.ficha_tecnica, **serializar(self)}
