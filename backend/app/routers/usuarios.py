"""Gestión de usuarios. Solo para administradores."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.db import BD
from app.models import Usuario
from app.schemas.base import Pagina
from app.schemas.usuario import ContrasenaNueva, UsuarioCambios, UsuarioNuevo, UsuarioSalida
from app.security import Admin
from app.services import usuarios as servicio

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])


def _buscar(bd: BD, usuario_id: str) -> Usuario:
    usuario = bd.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    return usuario


@router.get("", response_model=Pagina[UsuarioSalida])
def listar(
    bd: BD,
    _: Admin,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict:
    return {
        "items": bd.scalars(
            select(Usuario).order_by(Usuario.usuario).limit(limit).offset(offset)
        ).all(),
        "total": bd.scalar(select(func.count()).select_from(Usuario)),
        "limit": limit,
        "offset": offset,
    }


@router.post("", response_model=UsuarioSalida, status_code=status.HTTP_201_CREATED)
def crear(datos: UsuarioNuevo, bd: BD, admin: Admin) -> Usuario:
    if admin.usuario != "admin":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Solo el usuario administrador principal ('admin') tiene permisos para crear nuevos usuarios",
        )
    try:
        usuario = servicio.crear_usuario(bd, datos, admin)
    except servicio.UsuarioDuplicado:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Ya existe un usuario con ese nombre"
        ) from None
    bd.commit()
    return usuario


@router.patch("/{usuario_id}", response_model=UsuarioSalida)
def actualizar(usuario_id: str, datos: UsuarioCambios, bd: BD, admin: Admin) -> Usuario:
    usuario = _buscar(bd, usuario_id)
    try:
        servicio.actualizar_usuario(bd, usuario, datos, admin)
    except servicio.CambioSobreUnoMismo:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "No puedes quitarte el rol de administrador ni desactivar tu propia cuenta",
        ) from None
    bd.commit()
    return usuario


@router.post("/{usuario_id}/contrasena", status_code=status.HTTP_204_NO_CONTENT)
def cambiar_contrasena(usuario_id: str, datos: ContrasenaNueva, bd: BD, admin: Admin) -> None:
    servicio.cambiar_contrasena(bd, _buscar(bd, usuario_id), datos.password, admin)
    bd.commit()
