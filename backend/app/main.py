import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import obtener_ajustes
from app.db import obtener_motor
from app.errores import DatoInvalido, ErrorDeNegocio
from app.models import Rol, Usuario
from app.routers import (
    auth,
    configuracion,
    dashboard,
    equipos,
    mantenimientos,
    prestamos,
    salud,
    sedes,
    usuarios,
)
from app.security import hashear_contrasena

METODOS = ["GET", "POST", "PUT", "PATCH", "DELETE"]


def _error_de_negocio(_: Request, error: ErrorDeNegocio) -> JSONResponse:
    if isinstance(error, DatoInvalido):
        # Misma forma que los errores de validación automáticos de FastAPI.
        detalle = [{"type": "value_error", "loc": ["body", error.campo], "msg": error.detalle}]
        return JSONResponse({"detail": detalle}, status_code=error.codigo)
    return JSONResponse({"detail": error.detalle}, status_code=error.codigo)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Si la base no está en modo pruebas, asegura que exista el usuario admin inicial.
    if not os.environ.get("PYTEST_CURRENT_TEST"):
        try:
            motor = obtener_motor()
            with Session(motor) as bd:
                admin_existente = bd.scalar(select(Usuario).where(Usuario.usuario == "admin"))
                if not admin_existente:
                    admin_nuevo = Usuario(
                        usuario="admin",
                        nombre="Administrador Fondacio",
                        hash_contrasena=hashear_contrasena("012345678"),
                        rol=Rol.ADMIN,
                        activo=True,
                    )
                    bd.add(admin_nuevo)
                    bd.commit()
        except Exception:
            pass
    yield


def crear_app() -> FastAPI:
    app = FastAPI(title="Inventario Fondacio Colombia", lifespan=lifespan)
    app.add_exception_handler(ErrorDeNegocio, _error_de_negocio)
    for modulo in (
        salud,
        auth,
        usuarios,
        sedes,
        equipos,
        prestamos,
        mantenimientos,
        configuracion,
        dashboard,
    ):
        app.include_router(modulo.router)

    # Sin esto, una ruta de API mal escrita caería en los archivos estáticos.
    @app.api_route("/api/{resto:path}", methods=METODOS, include_in_schema=False)
    def api_no_encontrada(resto: str) -> None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ruta no encontrada")

    # Va al final: atiende todo lo que no sea una ruta declarada arriba.
    app.mount(
        "/", StaticFiles(directory=obtener_ajustes().frontend_dir, html=True), name="frontend"
    )
    return app


app = crear_app()
