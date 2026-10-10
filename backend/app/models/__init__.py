"""Modelos de la base de datos.

Cada modelo nuevo se importa aquí para que Alembic lo vea en Base.metadata.
"""

from app.models.auditoria import Auditoria
from app.models.configuracion import Configuracion
from app.models.equipo import Equipo, EstadoEquipo
from app.models.mantenimiento import EstadoMantenimiento, Mantenimiento, TipoMantenimiento
from app.models.prestamo import EstadoPrestamo, Prestamo
from app.models.sede import Sede
from app.models.usuario import Rol, Sesion, Usuario

__all__ = [
    "Auditoria",
    "Configuracion",
    "Equipo",
    "EstadoEquipo",
    "EstadoMantenimiento",
    "EstadoPrestamo",
    "Mantenimiento",
    "Prestamo",
    "Rol",
    "Sede",
    "Sesion",
    "TipoMantenimiento",
    "Usuario",
]
