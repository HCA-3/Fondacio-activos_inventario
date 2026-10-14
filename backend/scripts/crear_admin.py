"""Crea un administrador desde la terminal. Sirve para el primero, cuando aún no hay ninguno.

Uso, desde backend/:
    uv run python -m scripts.crear_admin

Usa la base de DATABASE_URL. Para producción, pon ahí la cadena de Neon solo para este comando.
"""

import argparse
import sys
from getpass import getpass

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import obtener_motor
from app.models import Rol, Usuario
from app.schemas.usuario import UsuarioNuevo
from app.security import hashear_contrasena
from app.services.usuarios import UsuarioDuplicado, crear_usuario


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Crea o actualiza el usuario administrador inicial."
    )
    parser.add_argument("--usuario", default="admin", help="Nombre de usuario (por defecto: admin)")
    parser.add_argument("--nombre", default="Administrador Fondacio", help="Nombre completo")
    parser.add_argument(
        "--contrasena",
        default="012345678",
        help="Contraseña (por defecto: 012345678)",
    )
    parser.add_argument(
        "--interactivo",
        action="store_true",
        help="Solicitar datos interactivamente por consola",
    )
    args = parser.parse_args()

    motor = obtener_motor()
    print(f"Base de datos: {motor.url.database} en {motor.url.host}")

    if args.interactivo:
        usuario = input("Usuario: ")
        nombre = input("Nombre completo: ")
        contrasena = getpass("Contraseña (mínimo 8 caracteres): ")
        if contrasena != getpass("Repite la contraseña: "):
            print("Las contraseñas no coinciden.")
            return 1
    else:
        usuario = args.usuario
        nombre = args.nombre
        contrasena = args.contrasena

    try:
        datos = UsuarioNuevo(username=usuario, name=nombre, password=contrasena, role=Rol.ADMIN)
    except ValidationError as error:
        for fallo in error.errors(include_input=False):
            print(f"{fallo['loc'][0]}: {fallo['msg']}")
        return 1

    with Session(motor) as bd:
        existente = bd.scalar(select(Usuario).where(Usuario.usuario == datos.username))
        if existente:
            existente.nombre = datos.name
            existente.hash_contrasena = hashear_contrasena(datos.password)
            existente.rol = Rol.ADMIN
            existente.activo = True
            bd.commit()
            print(f"Usuario {datos.username!r} actualizado con nueva contraseña.")
            return 0

        try:
            creado = crear_usuario(bd, datos, autor=None)
        except UsuarioDuplicado:
            print(f"Ya existe el usuario {datos.username!r}.")
            return 1
        bd.commit()
        print(f"Administrador {creado.usuario!r} creado con éxito.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
