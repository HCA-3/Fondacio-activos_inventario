"""Equipos del inventario."""

from datetime import date, datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    LargeBinary,
    Numeric,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.comun import Trazable, nuevo_id
from app.models.sede import Sede


class EstadoEquipo(StrEnum):
    OPERATIVO = "operativo"
    BODEGA = "bodega"
    PRESTADO = "prestado"
    MANTENIMIENTO = "mantenimiento"
    BAJA = "baja"


# Los pone el servidor al registrar un préstamo o un mantenimiento; nadie los fija a mano.
ESTADOS_DEL_SISTEMA = {EstadoEquipo.PRESTADO, EstadoEquipo.MANTENIMIENTO}
ESTADOS_DISPONIBLES = {EstadoEquipo.OPERATIVO, EstadoEquipo.BODEGA}


class Equipo(Trazable, Base):
    __tablename__ = "equipos"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('operativo', 'bodega', 'prestado', 'mantenimiento', 'baja')",
            name="estado_valido",
        ),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=nuevo_id)
    placa: Mapped[str] = mapped_column(Text, unique=True)
    sede_id: Mapped[str] = mapped_column(ForeignKey("sedes.id"), index=True)
    estado: Mapped[str] = mapped_column(Text, index=True)
    categoria: Mapped[str] = mapped_column(Text, server_default="", index=True)
    tipo_equipo: Mapped[str] = mapped_column(Text, server_default="")
    marca: Mapped[str] = mapped_column(Text, server_default="")
    modelo: Mapped[str] = mapped_column(Text, server_default="")
    serial: Mapped[str] = mapped_column(Text, server_default="")
    area: Mapped[str] = mapped_column(Text, server_default="")
    responsable: Mapped[str] = mapped_column(Text, server_default="")
    cargo_responsable: Mapped[str] = mapped_column(Text, server_default="")
    ubicacion: Mapped[str] = mapped_column(Text, server_default="")
    condicion: Mapped[str] = mapped_column(Text, server_default="")
    valor_estimado: Mapped[float | None] = mapped_column(Numeric(14, 2, asdecimal=False))
    fecha_compra: Mapped[date | None] = mapped_column(Date)
    imagen: Mapped[str] = mapped_column(Text, server_default="")
    # El resto de la hoja de vida (procesador, RAM, discos, red, licencias...), tal como la
    # nombra el frontend.
    ficha_tecnica: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")

    sede: Mapped[Sede] = relationship(lazy="selectin")

    @property
    def sede_nombre(self) -> str:
        return self.sede.nombre

    @property
    def nombre(self) -> str:
        return f"{self.marca} {self.modelo}".strip()


class EquipoImagen(Base):
    """Foto subida de un equipo, ya reducida. Tabla aparte para no cargarla con el equipo."""

    __tablename__ = "equipo_imagenes"

    equipo_id: Mapped[str] = mapped_column(
        ForeignKey("equipos.id", ondelete="CASCADE"), primary_key=True
    )
    contenido: Mapped[bytes] = mapped_column(LargeBinary)
    tipo: Mapped[str] = mapped_column(Text)
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
