"""Excel de donaciones: una hoja con las actas y otra con cada ítem recibido."""

from collections.abc import Iterable
from datetime import date
from io import BytesIO

from openpyxl import Workbook

from app.models import Donacion
from app.schemas.donacion import DonacionSalida
from app.services.exportacion import Columna, Fila, _hoja, _v

ESTADOS = {"recibida": "Recibida", "anulada": "Anulada"}
CONDICIONES = {"nuevo": "Nuevo", "usado": "Usado", "danado": "Dañado"}

DONACIONES: list[Columna] = [
    ("Fecha", lambda f: date.fromisoformat(f["donationDate"])),
    ("Donante", _v("donorName")),
    ("Sede", _v("sede")),
    ("Estado", lambda f: ESTADOS.get(f["status"], f["status"])),
    ("Ítems", lambda f: len(f["items"])),
    ("Unidades", lambda f: sum(i["quantity"] for i in f["items"])),
    ("Valor total estimado (COP)", _v("totalEstimated")),
    ("Notas", _v("notes")),
]

# Cada fila es un ítem con los datos de su donación (ver `_filas_de_items`).
ITEMS: list[Columna] = [
    ("Fecha", lambda f: date.fromisoformat(f["donationDate"])),
    ("Donante", _v("donorName")),
    ("Sede", _v("sede")),
    ("Estado de la donación", lambda f: ESTADOS.get(f["status"], f["status"])),
    ("Ítem", _v("name")),
    ("Categoría", _v("categoryName")),
    ("Cantidad", _v("quantity")),
    ("Estado del ítem", lambda f: CONDICIONES.get(f["condition"], f["condition"])),
    ("Valor unitario (COP)", lambda f: f["estimatedUnitValue"]),
    (
        "Valor total (COP)",
        lambda f: (
            None if f["estimatedUnitValue"] is None else f["quantity"] * f["estimatedUnitValue"]
        ),
    ),
    ("Descripción", _v("description")),
]


def _filas_de_items(donaciones: list[Fila]) -> list[Fila]:
    encabezado = ("donationDate", "donorName", "sede", "status")
    return [
        {**{campo: donacion[campo] for campo in encabezado}, **item}
        for donacion in donaciones
        for item in donacion["items"]
    ]


def generar_excel_donaciones(donaciones: Iterable[Donacion]) -> bytes:
    filas = [
        DonacionSalida.model_validate(donacion).model_dump(mode="json", by_alias=True)
        for donacion in donaciones
    ]
    libro = Workbook(write_only=True)
    _hoja(libro, "Donaciones", DONACIONES, filas)
    _hoja(libro, "Ítems", ITEMS, _filas_de_items(filas))

    salida = BytesIO()
    libro.save(salida)
    return salida.getvalue()
