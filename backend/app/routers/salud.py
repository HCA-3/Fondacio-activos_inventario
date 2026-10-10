"""Comprobaciones de estado del servicio."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import obtener_sesion

router = APIRouter(tags=["salud"])


@router.get("/health")
def salud() -> dict[str, str]:
    # No consulta la base: el monitor llama aquí cada pocos minutos y no debe despertar a Neon.
    return {"estado": "ok"}


@router.get("/health/db")
def salud_db(sesion: Annotated[Session, Depends(obtener_sesion)]) -> dict[str, str]:
    try:
        sesion.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Sin conexión con la base de datos"
        ) from error
    return {"estado": "ok"}
