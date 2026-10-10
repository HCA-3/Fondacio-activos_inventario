"""Registro de quién hizo qué. Solo se insertan filas; nunca se editan ni se borran."""

from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, DateTime, ForeignKey, Identity, Index, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Auditoria(Base):
    __tablename__ = "auditoria"
    __table_args__ = (Index("ix_auditoria_entidad", "entidad", "entidad_id"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    # Vacío cuando la acción no la hizo un usuario (por ejemplo, el script crear_admin).
    usuario_id: Mapped[str | None] = mapped_column(ForeignKey("usuarios.id"), index=True)
    accion: Mapped[str] = mapped_column(Text)
    entidad: Mapped[str] = mapped_column(Text)
    entidad_id: Mapped[str] = mapped_column(Text)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    cambios: Mapped[dict[str, Any] | None] = mapped_column(JSONB(none_as_null=True))
