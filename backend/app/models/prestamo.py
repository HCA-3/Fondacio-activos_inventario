"""Préstamos de equipos. Nunca se borran: la tabla es el historial."""

from datetime import date
from enum import StrEnum

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.comun import Trazable, nuevo_id
from app.models.sede import Sede
from app.tiempo import hoy


class EstadoPrestamo(StrEnum):
    ACTIVO = "activo"
    DEVUELTO = "devuelto"


class Prestamo(Trazable, Base):
    __tablename__ = "prestamos"
    __table_args__ = (
        CheckConstraint("estado IN ('activo', 'devuelto')", name="estado_valido"),
        # Un equipo no puede tener dos préstamos activos a la vez.
        Index(
            "uq_prestamos_activo_por_equipo",
            "equipo_id",
            unique=True,
            postgresql_where=text("estado = 'activo'"),
        ),
        Index("ix_prestamos_estado", "estado"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=nuevo_id)
    equipo_id: Mapped[str] = mapped_column(ForeignKey("equipos.id"), index=True)
    # Copia de la placa y el nombre del equipo el día de la entrega, para el acta.
    equipo_placa: Mapped[str] = mapped_column(Text)
    equipo_nombre: Mapped[str] = mapped_column(Text, server_default="")
    prestatario_nombre: Mapped[str] = mapped_column(Text)
    prestatario_documento: Mapped[str] = mapped_column(Text, server_default="", index=True)
    prestatario_cargo: Mapped[str] = mapped_column(Text, server_default="")
    prestatario_correo: Mapped[str] = mapped_column(Text, server_default="")
    prestatario_telefono: Mapped[str] = mapped_column(Text, server_default="")
    sede_id: Mapped[str | None] = mapped_column(ForeignKey("sedes.id"), index=True)
    proposito: Mapped[str] = mapped_column(Text, server_default="")
    fecha_prestamo: Mapped[date] = mapped_column(Date)
    fecha_devolucion_prevista: Mapped[date | None] = mapped_column(Date)
    fecha_devolucion: Mapped[date | None] = mapped_column(Date)
    estado: Mapped[str] = mapped_column(Text)
    condicion_entrega: Mapped[str] = mapped_column(Text, server_default="")
    notas_devolucion: Mapped[str] = mapped_column(Text, server_default="")

    sede: Mapped[Sede | None] = relationship(lazy="selectin")

    @property
    def sede_nombre(self) -> str:
        return self.sede.nombre if self.sede else ""

    @property
    def vencido(self) -> bool:
        # No se guarda: depende de la fecha de hoy.
        return (
            self.estado == EstadoPrestamo.ACTIVO
            and self.fecha_devolucion_prevista is not None
            and self.fecha_devolucion_prevista < hoy()
        )
