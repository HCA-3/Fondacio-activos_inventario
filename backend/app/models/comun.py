"""Piezas compartidas por los modelos."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column


def nuevo_id() -> str:
    # Llaves de texto: los registros importados conservan su id original, los nuevos usan UUID.
    return str(uuid4())


class Trazable:
    """Quién creó y quién tocó por última vez el registro."""

    creado_por: Mapped[str | None] = mapped_column(ForeignKey("usuarios.id"))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado_por: Mapped[str | None] = mapped_column(ForeignKey("usuarios.id"))
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
