"""Esquemas de donaciones."""

from datetime import date, datetime
from typing import Annotated

from pydantic import Field, model_validator

from app.models.donacion import EstadoDonacion, EstadoItem
from app.schemas.base import Entrada, Salida
from app.schemas.comunes import FechaOpcional, NoNulo, Texto, TextoLargo, TextoObligatorio
from app.schemas.equipo import EquipoNuevo

Cantidad = Annotated[int, Field(ge=1, le=1_000_000)]
Pesos = Annotated[int, Field(ge=0, le=100_000_000_000)]


class ItemNuevo(Entrada):
    name: TextoObligatorio
    # Una categoría existente, o el nombre de una nueva que se crea al guardar. Solo una de las dos.
    category_id: Texto = ""
    new_category: Texto = ""
    quantity: Cantidad = 1
    condition: EstadoItem = EstadoItem.NUEVO
    estimated_unit_value: Pesos | None = None
    description: TextoLargo = ""

    @model_validator(mode="after")
    def _una_sola_categoria(self) -> "ItemNuevo":
        if self.category_id and self.new_category:
            raise ValueError("Envía categoryId o newCategory, no las dos")
        return self


class ItemCambio(ItemNuevo):
    """Ítem al editar: con `id` se actualiza el existente, sin él se crea uno nuevo."""

    id: Texto = ""


class EquipoDeItem(EquipoNuevo):
    """Datos que faltan para convertir un ítem en equipo; sin sede se usa la de la donación."""

    sede: Texto = ""


class DonacionNueva(Entrada):
    donor_id: TextoObligatorio
    sede: TextoObligatorio
    donation_date: FechaOpcional = None
    notes: TextoLargo = ""
    items: Annotated[list[ItemNuevo], Field(min_length=1, max_length=200)]


class DonacionCambios(Entrada):
    donor_id: Annotated[TextoObligatorio | None, NoNulo] = None
    sede: Annotated[TextoObligatorio | None, NoNulo] = None
    donation_date: Annotated[date | None, NoNulo] = None
    notes: TextoLargo = ""
    # Si viene, reemplaza la lista completa de ítems. Los ítems convertidos en equipo deben seguir
    # en la lista, con su id y sin cambios.
    items: Annotated[list[ItemCambio] | None, Field(min_length=1, max_length=200), NoNulo] = None


class ItemSalida(Salida):
    id: str
    name: str = Field(validation_alias="nombre")
    category_id: str | None = Field(validation_alias="categoria_id")
    category_name: str = Field(validation_alias="categoria_nombre")
    quantity: int = Field(validation_alias="cantidad")
    condition: EstadoItem = Field(validation_alias="estado")
    estimated_unit_value: int | None = Field(validation_alias="valor_unitario")
    description: str = Field(validation_alias="descripcion")
    asset_id: str | None = Field(validation_alias="equipo_id")


class DonacionSalida(Salida):
    id: str
    donor_id: str = Field(validation_alias="donante_id")
    donor_name: str = Field(validation_alias="donante_nombre")
    sede: str = Field(validation_alias="sede_nombre")
    donation_date: date = Field(validation_alias="fecha")
    notes: str = Field(validation_alias="notas")
    status: EstadoDonacion = Field(validation_alias="estado")
    receipt: str = Field(validation_alias="comprobante")
    items: list[ItemSalida]
    total_estimated: int = Field(validation_alias="total_estimado")
    created_at: datetime = Field(validation_alias="creado_en")
    updated_at: datetime = Field(validation_alias="actualizado_en")
