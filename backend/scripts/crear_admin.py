"""Crea un administrador desde la terminal. Sirve para el primero, cuando aún no hay ninguno.

Uso, desde backend/:
    uv run python -m scripts.crear_admin

Usa la base de DATABASE_URL. Para producción, pon ahí la cadena de Neon solo para este comando.
"""

import sys
from getpass import getpass

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.db import obtener_motor
from app.models import Rol
from app.schemas.usuario import UsuarioNuevo
from app.services.usuarios import UsuarioDuplicado, crear_usuario


def main() -> int:
    motor = obtener_motor()
    print(f"Base de datos: {motor.url.database} en {motor.url.host}")

    usuario = input("Usuario: ")
    nombre = input("Nombre completo: ")
    contrasena = getpass("Contraseña (mínimo 8 caracteres): ")
    if contrasena != getpass("Repite la contraseña: "):
        print("Las contraseñas no coinciden.")
        return 1

    try:
        datos = UsuarioNuevo(username=usuario, name=nombre, password=contrasena, role=Rol.ADMIN)
    except ValidationError as error:
        for fallo in error.errors(include_input=False):
            print(f"{fallo['loc'][0]}: {fallo['msg']}")
        return 1

    with Session(motor) as bd:
        try:
            creado = crear_usuario(bd, datos, autor=None)
        except UsuarioDuplicado:
            print(f"Ya existe el usuario {datos.username!r}.")
            return 1
        bd.commit()
        print(f"Administrador {creado.usuario!r} creado.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
