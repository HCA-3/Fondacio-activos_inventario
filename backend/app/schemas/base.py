"""Bases de los esquemas de la API.

El JSON usa camelCase en inglés, igual que los objetos del frontend; las tablas están en español.
"""

from pydantic import AliasGenerator, BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class Entrada(BaseModel):
    """Cuerpo de una petición."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class Salida(BaseModel):
    """Respuesta construida a partir de un modelo de la base."""

    model_config = ConfigDict(
        from_attributes=True, alias_generator=AliasGenerator(serialization_alias=to_camel)
    )


class Pagina[T](Salida):
    """Forma de todas las listas de la API."""

    items: list[T]
    total: int
    limit: int
    offset: int
