"""Inicio y cierre de sesión."""

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import delete, select

from app.db import BD
from app.models import Sesion, Usuario
from app.schemas.usuario import ContrasenaNueva, Credenciales, UsuarioSalida
from app.security import (
    COOKIE_SESION,
    UsuarioActual,
    abrir_sesion,
    buscar_sesion,
    hashear_contrasena,
    limite_login,
    poner_cookie,
    quitar_cookie,
    verificar_contrasena,
)
from app.services.auditoria import registrar
from app.services.usuarios import cerrar_sesiones

router = APIRouter(prefix="/api/auth", tags=["sesión"])


@router.post("/login", response_model=UsuarioSalida)
def iniciar_sesion(datos: Credenciales, respuesta: Response, bd: BD) -> Usuario:
    espera = limite_login.segundos_de_espera(datos.username)
    if espera:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Demasiados intentos fallidos. Intenta de nuevo más tarde.",
            headers={"Retry-After": str(espera)},
        )

    usuario = bd.scalar(select(Usuario).where(Usuario.usuario == datos.username))
    coincide = verificar_contrasena(usuario.hash_contrasena if usuario else None, datos.password)
    if usuario is None or not usuario.activo or not coincide:
        limite_login.registrar_fallo(datos.username)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario o contraseña incorrectos")

    limite_login.limpiar(datos.username)
    bd.execute(delete(Sesion).where(Sesion.expira_en < datetime.now(UTC)))
    token = abrir_sesion(bd, usuario)
    registrar(bd, usuario, "iniciar_sesion", "usuarios", usuario.id)
    bd.commit()
    poner_cookie(respuesta, token)
    return usuario


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def cerrar_sesion(request: Request, respuesta: Response, bd: BD) -> None:
    sesion = buscar_sesion(bd, request.cookies.get(COOKIE_SESION))
    if sesion:
        bd.delete(sesion)
        bd.commit()
    quitar_cookie(respuesta)


@router.get("/me", response_model=UsuarioSalida)
def quien_soy(usuario: UsuarioActual) -> Usuario:
    return usuario


@router.post("/contrasena", status_code=status.HTTP_200_OK)
def cambiar_mi_contrasena(
    datos: ContrasenaNueva, respuesta: Response, usuario: UsuarioActual, bd: BD
) -> dict:
    usuario.hash_contrasena = hashear_contrasena(datos.password)
    cerrar_sesiones(bd, usuario)
    token = abrir_sesion(bd, usuario)
    registrar(bd, usuario, "cambiar_contrasena", "usuarios", usuario.id)
    bd.commit()
    poner_cookie(respuesta, token)
    return {"mensaje": "Contraseña actualizada exitosamente"}
