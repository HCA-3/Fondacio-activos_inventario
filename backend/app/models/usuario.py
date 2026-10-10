"""Usuarios del sistema y sus sesiones abiertas."""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Text, func, true
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.comun import nuevo_id


class Rol(StrEnum):
    ADMIN = "admin"
    CONSULTA = "consulta"


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (CheckConstraint("rol IN ('admin', 'consulta')", name="rol_valido"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=nuevo_id)
    usuario: Mapped[str] = mapped_column(Text, unique=True)
    nombre: Mapped[str] = mapped_column(Text)
    hash_contrasena: Mapped[str] = mapped_column(Text)
    rol: Mapped[str] = mapped_column(Text)
    activo: Mapped[bool] = mapped_column(default=True, server_default=true())
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Sesion(Base):
    """Sesión iniciada. Se guarda el hash del token, nunca el token."""

    __tablename__ = "sesiones"

    token_hash: Mapped[str] = mapped_column(Text, primary_key=True)
    usuario_id: Mapped[str] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), index=True
    )
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
