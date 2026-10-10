"""Configuración global: colores del tema y datos de la organización."""

from fastapi import APIRouter

from app.db import BD
from app.schemas.configuracion import ConfiguracionCambios, ConfiguracionSalida
from app.security import Admin, UsuarioActual
from app.services import configuracion as servicio

router = APIRouter(prefix="/api/configuracion", tags=["configuración"])


@router.get("", response_model=ConfiguracionSalida)
def ver(bd: BD, _: UsuarioActual) -> dict:
    return servicio.leer_configuracion(bd)


@router.patch("", response_model=ConfiguracionSalida)
def cambiar(datos: ConfiguracionCambios, bd: BD, admin: Admin) -> dict:
    configuracion = servicio.cambiar_configuracion(bd, datos, admin)
    bd.commit()
    return configuracion
