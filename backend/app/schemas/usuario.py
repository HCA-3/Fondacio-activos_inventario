"""Esquemas de sesión y de gestión de usuarios."""

from datetime import datetime
from typing import Annotated

from pydantic import BeforeValidator, Field, StringConstraints

from app.models.usuario import Rol
from app.schemas.base import Entrada, Salida


def _normalizar(valor: object) -> object:
    return valor.strip().lower() if isinstance(valor, str) else valor


UsuarioNormalizado = Annotated[str, BeforeValidator(_normalizar), Field(max_length=50)]
NombreUsuario = Annotated[
    str, BeforeValidator(_normalizar), StringConstraints(pattern=r"^[a-z0-9._-]{3,50}$")
]
Contrasena = Annotated[str, Field(min_length=8, max_length=128)]


class Credenciales(Entrada):
    username: UsuarioNormalizado
    password: str = Field(max_length=128)


class UsuarioNuevo(Entrada):
    username: NombreUsuario
    name: str = Field(min_length=1, max_length=100)
    password: Contrasena
    role: Rol


class UsuarioCambios(Entrada):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    role: Rol | None = None
    active: bool | None = None


class ContrasenaNueva(Entrada):
    password: Contrasena


class UsuarioSalida(Salida):
    id: str
    username: str = Field(validation_alias="usuario")
    name: str = Field(validation_alias="nombre")
    role: Rol = Field(validation_alias="rol")
    active: bool = Field(validation_alias="activo")
    created_at: datetime = Field(validation_alias="creado_en")
