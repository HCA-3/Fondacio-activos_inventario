"""Altas y cambios de usuarios, con su rastro en la auditoría."""

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Rol, Sesion, Usuario
from app.schemas.usuario import UsuarioCambios, UsuarioNuevo
from app.security import hashear_contrasena
from app.services.auditoria import registrar


class UsuarioDuplicado(Exception):
    """Ya existe un usuario con ese nombre."""


class CambioSobreUnoMismo(Exception):
    """Un administrador no puede quitarse el rol ni desactivar su propia cuenta."""


def crear_usuario(bd: Session, datos: UsuarioNuevo, autor: Usuario | None) -> Usuario:
    if bd.scalar(select(Usuario.id).where(Usuario.usuario == datos.username)):
        raise UsuarioDuplicado
    usuario = Usuario(
        usuario=datos.username,
        nombre=datos.name,
        hash_contrasena=hashear_contrasena(datos.password),
        rol=datos.role,
    )
    bd.add(usuario)
    bd.flush()
    registrar(
        bd,
        autor,
        "crear",
        "usuarios",
        usuario.id,
        {"usuario": usuario.usuario, "nombre": usuario.nombre, "rol": usuario.rol},
    )
    return usuario


def cerrar_sesiones(bd: Session, usuario: Usuario) -> None:
    bd.execute(delete(Sesion).where(Sesion.usuario_id == usuario.id))


def actualizar_usuario(
    bd: Session, usuario: Usuario, datos: UsuarioCambios, autor: Usuario
) -> Usuario:
    nuevos = {
        "nombre": datos.name,
        "rol": datos.role,
        "activo": datos.active,
    }
    cambios = {
        campo: [getattr(usuario, campo), valor]
        for campo, valor in nuevos.items()
        if valor is not None and valor != getattr(usuario, campo)
    }
    pierde_acceso = cambios.get("activo") == [True, False] or (
        "rol" in cambios and usuario.rol == Rol.ADMIN
    )
    if usuario.id == autor.id and pierde_acceso:
        raise CambioSobreUnoMismo

    for campo, (_, valor) in cambios.items():
        setattr(usuario, campo, valor)
    if not usuario.activo:
        cerrar_sesiones(bd, usuario)
    if cambios:
        registrar(bd, autor, "actualizar", "usuarios", usuario.id, cambios)
    return usuario


def cambiar_contrasena(bd: Session, usuario: Usuario, contrasena: str, autor: Usuario) -> None:
    usuario.hash_contrasena = hashear_contrasena(contrasena)
    cerrar_sesiones(bd, usuario)
    registrar(bd, autor, "cambiar_contrasena", "usuarios", usuario.id)
