"""Categorías de los ítems donados (Computadores, Sillas, Mesas...)."""

from sqlalchemy import Index, Text, func, true
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.comun import Trazable, nuevo_id


class Categoria(Trazable, Base):
    # Los ítems de donación que se añadan después deben referenciarla con ondelete="SET NULL":
    # al borrar una categoría los ítems siguen existiendo, como "Sin categoría".
    __tablename__ = "categorias"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=nuevo_id)
    nombre: Mapped[str] = mapped_column(Text)
    activa: Mapped[bool] = mapped_column(default=True, server_default=true())


# El nombre es único sin distinguir mayúsculas.
Index("uq_categorias_nombre_lower", func.lower(Categoria.nombre), unique=True)
