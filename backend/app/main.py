"""Aplicación FastAPI: rutas de la API y frontend estático en la raíz."""

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import obtener_ajustes
from app.errores import DatoInvalido, ErrorDeNegocio
from app.routers import (
    auth,
    configuracion,
    equipos,
    mantenimientos,
    prestamos,
    salud,
    sedes,
    usuarios,
)

METODOS = ["GET", "POST", "PUT", "PATCH", "DELETE"]


def _error_de_negocio(_: Request, error: ErrorDeNegocio) -> JSONResponse:
    if isinstance(error, DatoInvalido):
        # Misma forma que los errores de validación automáticos de FastAPI.
        detalle = [{"type": "value_error", "loc": ["body", error.campo], "msg": error.detalle}]
        return JSONResponse({"detail": detalle}, status_code=error.codigo)
    return JSONResponse({"detail": error.detalle}, status_code=error.codigo)


def crear_app() -> FastAPI:
    app = FastAPI(title="Inventario Fondacio Colombia")
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
