"""Préstamos de equipos."""

from datetime import date
from enum import StrEnum
from typing import Annotated

from fastapi import APIRouter, Query, status
from sqlalchemy import func, or_, select

from app.db import BD
from app.errores import NoEncontrado
from app.models import Prestamo, Sede
from app.models.prestamo import EstadoPrestamo
from app.paginacion import Pag, paginar
from app.schemas.base import Pagina
from app.schemas.prestamo import Devolucion, PrestamoCambios, PrestamoNuevo, PrestamoSalida
from app.security import Admin, UsuarioActual
from app.services import prestamos as servicio
from app.tiempo import hoy

router = APIRouter(prefix="/api/prestamos", tags=["préstamos"])

Filtro = Annotated[str | None, Query(max_length=100)]


class FiltroEstado(StrEnum):
    ACTIVO = "activo"
    DEVUELTO = "devuelto"
    # No es un estado guardado: son los activos cuya fecha de devolución ya pasó.
    VENCIDO = "vencido"


def _buscar(bd: BD, prestamo_id: str) -> Prestamo:
    prestamo = bd.get(Prestamo, prestamo_id)
    if prestamo is None:
        raise NoEncontrado("Préstamo no encontrado")
    return prestamo


@router.get("", response_model=Pagina[PrestamoSalida])
def listar(
    bd: BD,
    _: UsuarioActual,
    pag: Pag,
    estado: FiltroEstado | None = None,
    sede: Filtro = None,
    documento: Filtro = None,
    equipo: Filtro = None,
    desde: date | None = None,
    hasta: date | None = None,
) -> dict:
    consulta = select(Prestamo)
    if estado == FiltroEstado.VENCIDO:
        consulta = consulta.where(
            Prestamo.estado == EstadoPrestamo.ACTIVO, Prestamo.fecha_devolucion_prevista < hoy()
        )
    elif estado:
        consulta = consulta.where(Prestamo.estado == estado)
    if sede:
        consulta = consulta.join(Sede).where(
            or_(Sede.id == sede, func.lower(Sede.nombre) == sede.lower())
        )
    if documento:
        consulta = consulta.where(Prestamo.prestatario_documento == documento.strip())
    if equipo:
        consulta = consulta.where(Prestamo.equipo_id == equipo)
    if desde:
        consulta = consulta.where(Prestamo.fecha_prestamo >= desde)
    if hasta:
        consulta = consulta.where(Prestamo.fecha_prestamo <= hasta)
    return paginar(
        bd, consulta.order_by(Prestamo.fecha_prestamo.desc(), Prestamo.creado_en.desc()), pag
    )


@router.post("", response_model=PrestamoSalida, status_code=status.HTTP_201_CREATED)
def crear(datos: PrestamoNuevo, bd: BD, admin: Admin) -> Prestamo:
    prestamo = servicio.crear_prestamo(bd, datos, admin)
    bd.commit()
    return prestamo


@router.get("/{prestamo_id}", response_model=PrestamoSalida)
def ver(prestamo_id: str, bd: BD, _: UsuarioActual) -> Prestamo:
    return _buscar(bd, prestamo_id)


@router.patch("/{prestamo_id}", response_model=PrestamoSalida)
def actualizar(prestamo_id: str, datos: PrestamoCambios, bd: BD, admin: Admin) -> Prestamo:
    prestamo = servicio.actualizar_prestamo(bd, _buscar(bd, prestamo_id), datos, admin)
    bd.commit()
    return prestamo


@router.post("/{prestamo_id}/devolucion", response_model=PrestamoSalida)
def devolver(prestamo_id: str, bd: BD, admin: Admin, datos: Devolucion | None = None) -> Prestamo:
    prestamo = servicio.devolver_prestamo(
        bd, _buscar(bd, prestamo_id), datos or Devolucion(), admin
    )
    bd.commit()
    return prestamo
