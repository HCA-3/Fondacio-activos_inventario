"""Donantes: personas o empresas que entregan donaciones a la fundación."""

from enum import StrEnum

from sqlalchemy import CheckConstraint, Index, Text, text, true
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.comun import Trazable, nuevo_id


class TipoDonante(StrEnum):
    PERSONA = "persona"
    EMPRESA = "empresa"


class Donante(Trazable, Base):
    __tablename__ = "donantes"
    __table_args__ = (
        CheckConstraint("tipo IN ('persona', 'empresa')", name="tipo_valido"),
        # El nombre es único sin distinguir mayúsculas.
        Index("uq_donantes_nombre_lower", text("lower(nombre)"), unique=True),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=nuevo_id)
    nombre: Mapped[str] = mapped_column(Text)
    tipo: Mapped[str] = mapped_column(Text, default=TipoDonante.PERSONA)
    contacto: Mapped[str] = mapped_column(Text, server_default="")
    notas: Mapped[str] = mapped_column(Text, server_default="")
    activo: Mapped[bool] = mapped_column(default=True, server_default=true())
