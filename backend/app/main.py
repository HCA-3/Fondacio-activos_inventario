"""Aplicación FastAPI: rutas de la API y frontend estático en la raíz."""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import obtener_ajustes
from app.routers import salud


def crear_app() -> FastAPI:
    app = FastAPI(title="Inventario Fondacio Colombia")
    app.include_router(salud.router)
    # Va al final: atiende todo lo que no sea una ruta declarada arriba.
    app.mount(
        "/", StaticFiles(directory=obtener_ajustes().frontend_dir, html=True), name="frontend"
    )
    return app


app = crear_app()
