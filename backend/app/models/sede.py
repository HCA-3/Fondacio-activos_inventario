"""Sedes de la fundación."""

from sqlalchemy import Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.comun import Trazable, nuevo_id


class Sede(Trazable, Base):
    __tablename__ = "sedes"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=nuevo_id)
    nombre: Mapped[str] = mapped_column(Text, unique=True)
    nombre_completo: Mapped[str] = mapped_column(Text, server_default="")
    codigo: Mapped[str] = mapped_column(Text, server_default="")
    direccion: Mapped[str] = mapped_column(Text, server_default="")
    ciudad: Mapped[str] = mapped_column(Text, server_default="")
    telefono: Mapped[str] = mapped_column(Text, server_default="")
    correo: Mapped[str] = mapped_column(Text, server_default="")
    color: Mapped[str] = mapped_column(Text, server_default="")
    enfoque: Mapped[str] = mapped_column(Text, server_default="")
