"""Piezas compartidas por los modelos."""

from uuid import uuid4


def nuevo_id() -> str:
    # Llaves de texto: los registros importados conservan su id original, los nuevos usan UUID.
    return str(uuid4())
