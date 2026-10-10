"""Mantenimientos de los equipos."""

from typing import Annotated

from fastapi import APIRouter, Query, status
from sqlalchemy import select

from app.db import BD
from app.errores import NoEncontrado
from app.models import EstadoMantenimiento, Mantenimiento, TipoMantenimiento
from app.paginacion import Pag, paginar
from app.schemas.base import Pagina
from app.schemas.mantenimiento import (
    Cierre,
    MantenimientoCambios,
    MantenimientoNuevo,
    MantenimientoSalida,
)
from app.security import Admin, UsuarioActual
from app.services import mantenimientos as servicio

router = APIRouter(prefix="/api/mantenimientos", tags=["mantenimientos"])


def _buscar(bd: BD, mantenimiento_id: str) -> Mantenimiento:
    mantenimiento = bd.get(Mantenimiento, mantenimiento_id)
    if mantenimiento is None:
        raise NoEncontrado("Mantenimiento no encontrado")
    return mantenimiento


@router.get("", response_model=Pagina[MantenimientoSalida])
def listar(
    bd: BD,
    _: UsuarioActual,
    pag: Pag,
    estado: EstadoMantenimiento | None = None,
    tipo: TipoMantenimiento | None = None,
    equipo: Annotated[str | None, Query(max_length=100)] = None,
) -> dict:
    consulta = select(Mantenimiento)
    if estado:
        consulta = consulta.where(Mantenimiento.estado == estado)
    if tipo:
        consulta = consulta.where(Mantenimiento.tipo == tipo)
    if equipo:
        consulta = consulta.where(Mantenimiento.equipo_id == equipo)
    return paginar(
        bd,
        consulta.order_by(Mantenimiento.fecha_solicitud.desc(), Mantenimiento.creado_en.desc()),
        pag,
    )


@router.post("", response_model=MantenimientoSalida, status_code=status.HTTP_201_CREATED)
def crear(datos: MantenimientoNuevo, bd: BD, admin: Admin) -> Mantenimiento:
    mantenimiento = servicio.crear_mantenimiento(bd, datos, admin)
    bd.commit()
    return mantenimiento


@router.get("/{mantenimiento_id}", response_model=MantenimientoSalida)
def ver(mantenimiento_id: str, bd: BD, _: UsuarioActual) -> Mantenimiento:
    return _buscar(bd, mantenimiento_id)


@router.patch("/{mantenimiento_id}", response_model=MantenimientoSalida)
def actualizar(
    mantenimiento_id: str, datos: MantenimientoCambios, bd: BD, admin: Admin
) -> Mantenimiento:
    mantenimiento = servicio.actualizar_mantenimiento(
        bd, _buscar(bd, mantenimiento_id), datos, admin
    )
    bd.commit()
    return mantenimiento


@router.post("/{mantenimiento_id}/completar", response_model=MantenimientoSalida)
def completar(
    mantenimiento_id: str, bd: BD, admin: Admin, datos: Cierre | None = None
) -> Mantenimiento:
    mantenimiento = servicio.completar_mantenimiento(
        bd, _buscar(bd, mantenimiento_id), datos or Cierre(), admin
    )
    bd.commit()
    return mantenimiento
