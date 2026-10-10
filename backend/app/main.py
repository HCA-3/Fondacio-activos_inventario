"""Aplicación FastAPI: rutas de la API y frontend estático en la raíz."""

from fastapi import FastAPI, HTTPException, status
from fastapi.staticfiles import StaticFiles

from app.config import obtener_ajustes
from app.routers import auth, salud, usuarios

METODOS = ["GET", "POST", "PUT", "PATCH", "DELETE"]


def crear_app() -> FastAPI:
    app = FastAPI(title="Inventario Fondacio Colombia")
    app.include_router(salud.router)
    app.include_router(auth.router)
    app.include_router(usuarios.router)

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
