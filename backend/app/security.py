"""Contraseñas, sesiones de usuario y permisos por rol."""

import hashlib
import secrets
import time
from collections import deque
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Annotated

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import obtener_ajustes
from app.db import BD
from app.models import Rol, Sesion, Usuario

COOKIE_SESION = "sesion"

_hasher = PasswordHasher()
# Se verifica contra este hash cuando el usuario no existe, para que la respuesta tarde lo mismo.
_HASH_SENUELO = _hasher.hash(secrets.token_urlsafe(16))


def hashear_contrasena(contrasena: str) -> str:
    return _hasher.hash(contrasena)


def verificar_contrasena(hash_guardado: str | None, contrasena: str) -> bool:
    try:
        return _hasher.verify(hash_guardado or _HASH_SENUELO, contrasena) and bool(hash_guardado)
    except (VerificationError, InvalidHashError):
        return False


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def abrir_sesion(bd: Session, usuario: Usuario) -> str:
    """Crea la sesión y devuelve el token que va en la cookie."""
    token = secrets.token_urlsafe(32)
    vence = datetime.now(UTC) + timedelta(hours=obtener_ajustes().horas_sesion)
    bd.add(Sesion(token_hash=_hash_token(token), usuario_id=usuario.id, expira_en=vence))
    return token


def buscar_sesion(bd: Session, token: str | None) -> Sesion | None:
    return bd.get(Sesion, _hash_token(token)) if token else None


def poner_cookie(respuesta: Response, token: str) -> None:
    ajustes = obtener_ajustes()
    respuesta.set_cookie(
        COOKIE_SESION,
        token,
        max_age=ajustes.horas_sesion * 3600,
        httponly=True,
        secure=ajustes.cookie_secure,
        samesite="lax",
    )


def quitar_cookie(respuesta: Response) -> None:
    respuesta.delete_cookie(
        COOKIE_SESION, httponly=True, secure=obtener_ajustes().cookie_secure, samesite="lax"
    )


def usuario_actual(request: Request, bd: BD) -> Usuario:
    token = request.cookies.get(COOKIE_SESION)
    usuario = None
    if token:
        usuario = bd.scalar(
            select(Usuario)
            .join(Sesion, Sesion.usuario_id == Usuario.id)
            .where(
                Sesion.token_hash == _hash_token(token),
                Sesion.expira_en > datetime.now(UTC),
                Usuario.activo,
            )
        )
    if usuario is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No has iniciado sesión")
    return usuario


UsuarioActual = Annotated[Usuario, Depends(usuario_actual)]


def requiere_admin(usuario: UsuarioActual) -> Usuario:
    if usuario.rol != Rol.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo un administrador puede hacer esto")
    return usuario


Admin = Annotated[Usuario, Depends(requiere_admin)]


class LimiteIntentos:
    """Frena los intentos de adivinar una contraseña.

    Cuenta los fallos recientes por nombre de usuario, en memoria: se pierde al reiniciar el
    servidor, que corre con un solo proceso. No usa la IP porque detrás del proxy de Render el
    cliente puede falsearla.
    """

    def __init__(
        self,
        maximo: int = 5,
        ventana_segundos: int = 15 * 60,
        reloj: Callable[[], float] = time.monotonic,
    ) -> None:
        self.maximo = maximo
        self.ventana = ventana_segundos
        self.reloj = reloj
        self._fallos: dict[str, deque[float]] = {}

    def _vigentes(self, clave: str) -> deque[float]:
        fallos = self._fallos.get(clave, deque())
        limite = self.reloj() - self.ventana
        while fallos and fallos[0] <= limite:
            fallos.popleft()
        if not fallos:
            self._fallos.pop(clave, None)
        return fallos

    def segundos_de_espera(self, clave: str) -> int:
        """Cero si se puede intentar; si no, cuánto falta para el siguiente intento."""
        fallos = self._vigentes(clave)
        if len(fallos) < self.maximo:
            return 0
        return max(1, int(fallos[0] + self.ventana - self.reloj()) + 1)

    def registrar_fallo(self, clave: str) -> None:
        if len(self._fallos) > 10_000:
            for otra in list(self._fallos):
                self._vigentes(otra)
        self._fallos.setdefault(clave, deque()).append(self.reloj())

    def limpiar(self, clave: str) -> None:
        self._fallos.pop(clave, None)

    def reiniciar(self) -> None:
        self._fallos.clear()


limite_login = LimiteIntentos()
