"""Tipos de campo compartidos por los esquemas.

El frontend manda "" en los campos que deja vacíos. Los textos se guardan así; las fechas y los
números vacíos se guardan como nulos.
"""

from datetime import date
from typing import Annotated, Any

from pydantic import AfterValidator, BeforeValidator, Field


def _texto(valor: Any) -> Any:
    if valor is None:
        return ""
    return valor.strip() if isinstance(valor, str) else valor


def _vacio_a_nulo(valor: Any) -> Any:
    return None if isinstance(valor, str) and not valor.strip() else valor


def _no_nulo(valor: Any) -> Any:
    if valor is None:
        raise ValueError("No puede ser nulo")
    return valor


Texto = Annotated[str, BeforeValidator(_texto), Field(max_length=300)]
TextoLargo = Annotated[str, BeforeValidator(_texto), Field(max_length=5000)]
TextoObligatorio = Annotated[str, BeforeValidator(_texto), Field(min_length=1, max_length=300)]
FechaOpcional = Annotated[date | None, BeforeValidator(_vacio_a_nulo)]
NumeroOpcional = Annotated[Annotated[float, Field(ge=0)] | None, BeforeValidator(_vacio_a_nulo)]
Ruta = Annotated[str, BeforeValidator(_texto), Field(max_length=500)]
# En los cambios parciales: el campo puede faltar, pero si viene no puede ser null.
NoNulo = AfterValidator(_no_nulo)
