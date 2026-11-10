"""Donantes: personas o empresas que entregan donaciones a la fundación."""

from enum import StrEnum

from sqlalchemy import CheckConstraint, Text, true
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.comun import Trazable, nuevo_id


class TipoDonante(StrEnum):
    PERSONA = "persona"
    EMPRESA = "empresa"


class Donante(Trazable, Base):
    __tablename__ = "donantes"
    __table_args__ = (CheckConstraint("tipo IN ('persona', 'empresa')", name="tipo_valido"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=nuevo_id)
    nombre: Mapped[str] = mapped_column(Text, unique=True)
    tipo: Mapped[str] = mapped_column(Text, default=TipoDonante.PERSONA)
    contacto: Mapped[str] = mapped_column(Text, server_default="")
    notas: Mapped[str] = mapped_column(Text, server_default="")
    activo: Mapped[bool] = mapped_column(default=True, server_default=true())
