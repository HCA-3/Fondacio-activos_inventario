"""Categorías de los ítems donados (Computadores, Sillas, Mesas...)."""

from sqlalchemy import Index, Text, text, true
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.comun import Trazable, nuevo_id


class Categoria(Trazable, Base):
    # Los ítems de donación que se añadan después deben referenciarla con ondelete="SET NULL":
    # al borrar una categoría los ítems siguen existiendo, como "Sin categoría".
    __tablename__ = "categorias"
    # El nombre es único sin distinguir mayúsculas.
    __table_args__ = (Index("uq_categorias_nombre_lower", text("lower(nombre)"), unique=True),)

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=nuevo_id)
    nombre: Mapped[str] = mapped_column(Text)
    activa: Mapped[bool] = mapped_column(default=True, server_default=true())
