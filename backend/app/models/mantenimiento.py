"""Mantenimientos de los equipos."""

from datetime import date
from enum import StrEnum

from sqlalchemy import CheckConstraint, Date, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.comun import Trazable, nuevo_id


class TipoMantenimiento(StrEnum):
    PREVENTIVO = "preventivo"
    CORRECTIVO = "correctivo"
    UPGRADE = "upgrade"


class EstadoMantenimiento(StrEnum):
    PROGRAMADO = "programado"
    EN_PROGRESO = "en_progreso"
    COMPLETADO = "completado"


ESTADOS_ABIERTOS = {EstadoMantenimiento.PROGRAMADO, EstadoMantenimiento.EN_PROGRESO}


class Mantenimiento(Trazable, Base):
    __tablename__ = "mantenimientos"
    __table_args__ = (
        CheckConstraint("tipo IN ('preventivo', 'correctivo', 'upgrade')", name="tipo_valido"),
        CheckConstraint(
            "estado IN ('programado', 'en_progreso', 'completado')", name="estado_valido"
        ),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=nuevo_id)
    equipo_id: Mapped[str] = mapped_column(ForeignKey("equipos.id"), index=True)
    equipo_placa: Mapped[str] = mapped_column(Text)
    equipo_nombre: Mapped[str] = mapped_column(Text, server_default="")
    tipo: Mapped[str] = mapped_column(Text)
    estado: Mapped[str] = mapped_column(Text, index=True)
    fecha_solicitud: Mapped[date] = mapped_column(Date)
    fecha_programada: Mapped[date | None] = mapped_column(Date)
    fecha_realizado: Mapped[date | None] = mapped_column(Date)
    tecnico: Mapped[str] = mapped_column(Text, server_default="")
    costo: Mapped[float] = mapped_column(Numeric(14, 2, asdecimal=False), server_default="0")
    descripcion: Mapped[str] = mapped_column(Text, server_default="")
    repuestos: Mapped[str] = mapped_column(Text, server_default="")
    proximo: Mapped[date | None] = mapped_column(Date)
    notas: Mapped[str] = mapped_column(Text, server_default="")
