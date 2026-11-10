"""Donaciones: actas de lo que la fundación recibe, con sus ítems. Nunca se borran, se anulan."""

from datetime import date
from enum import StrEnum

from sqlalchemy import BigInteger, CheckConstraint, Date, ForeignKey, Index, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.categoria import Categoria
from app.models.comun import Trazable, nuevo_id
from app.models.donante import Donante
from app.models.equipo import Equipo  # noqa: F401  (resuelve la clave foránea de equipo_id)
from app.models.sede import Sede


class EstadoDonacion(StrEnum):
    RECIBIDA = "recibida"
    ANULADA = "anulada"


class EstadoItem(StrEnum):
    NUEVO = "nuevo"
    USADO = "usado"
    DANADO = "danado"


class Donacion(Trazable, Base):
    __tablename__ = "donaciones"
    __table_args__ = (
        CheckConstraint("estado IN ('recibida', 'anulada')", name="estado_valido"),
        Index("ix_donaciones_fecha", "fecha"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=nuevo_id)
    donante_id: Mapped[str] = mapped_column(ForeignKey("donantes.id"), index=True)
    sede_id: Mapped[str] = mapped_column(ForeignKey("sedes.id"), index=True)
    fecha: Mapped[date] = mapped_column(Date)
    notas: Mapped[str] = mapped_column(Text, server_default="")
    estado: Mapped[str] = mapped_column(Text, default=EstadoDonacion.RECIBIDA)

    donante: Mapped[Donante] = relationship(lazy="selectin")
    sede: Mapped[Sede] = relationship(lazy="selectin")
    items: Mapped[list["ItemDonacion"]] = relationship(
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="ItemDonacion.orden",
    )

    @property
    def donante_nombre(self) -> str:
        return self.donante.nombre

    @property
    def sede_nombre(self) -> str:
        return self.sede.nombre

    @property
    def total_estimado(self) -> int:
        """Suma de cantidad por valor unitario; los ítems sin valor no suman."""
        return sum(i.cantidad * i.valor_unitario for i in self.items if i.valor_unitario)


class ItemDonacion(Base):
    __tablename__ = "donacion_items"
    __table_args__ = (
        CheckConstraint("cantidad >= 1", name="cantidad_positiva"),
        CheckConstraint("estado IN ('nuevo', 'usado', 'danado')", name="estado_valido"),
        CheckConstraint("valor_unitario IS NULL OR valor_unitario >= 0", name="valor_no_negativo"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=nuevo_id)
    donacion_id: Mapped[str] = mapped_column(
        ForeignKey("donaciones.id", ondelete="CASCADE"), index=True
    )
    orden: Mapped[int] = mapped_column(Integer)
    nombre: Mapped[str] = mapped_column(Text)
    # Al borrar la categoría el ítem sigue existiendo, sin categoría.
    categoria_id: Mapped[str | None] = mapped_column(
        ForeignKey("categorias.id", ondelete="SET NULL"), index=True
    )
    cantidad: Mapped[int] = mapped_column(Integer)
    estado: Mapped[str] = mapped_column(Text, default=EstadoItem.NUEVO)
    # Pesos colombianos por unidad.
    valor_unitario: Mapped[int | None] = mapped_column(BigInteger)
    descripcion: Mapped[str] = mapped_column(Text, server_default="")
    # Equipo del inventario en que se convirtió el ítem; con él el ítem queda bloqueado.
    equipo_id: Mapped[str | None] = mapped_column(
        ForeignKey("equipos.id", ondelete="SET NULL"), unique=True
    )

    categoria: Mapped[Categoria | None] = relationship(lazy="selectin")

    @property
    def categoria_nombre(self) -> str:
        return self.categoria.nombre if self.categoria else ""
