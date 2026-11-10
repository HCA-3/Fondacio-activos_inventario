"""Donaciones."""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.db import BD
from app.errores import NoEncontrado
from app.models import Donacion
from app.paginacion import Pag, paginar
from app.schemas.base import Pagina
from app.schemas.donacion import DonacionCambios, DonacionNueva, DonacionSalida
from app.security import Admin, UsuarioActual
from app.services import donaciones as servicio
from app.services.filtros_donaciones import FiltrosDeDonaciones

router = APIRouter(prefix="/api/donaciones", tags=["donaciones"])


def _buscar(bd: BD, donacion_id: str, *, bloquear: bool = False) -> Donacion:
    # Al escribir se bloquea la fila: dos cambios a la vez (editar y anular) no se cruzan.
    donacion = bd.get(Donacion, donacion_id, with_for_update=bloquear)
    if donacion is None:
        raise NoEncontrado("Donación no encontrada")
    return donacion


Filtros = Annotated[FiltrosDeDonaciones, Depends()]


@router.get("", response_model=Pagina[DonacionSalida])
def listar(bd: BD, _: UsuarioActual, pag: Pag, filtros: Filtros) -> dict:
    consulta = filtros.consulta().order_by(
        Donacion.fecha.desc(), Donacion.creado_en.desc(), Donacion.id
    )
    return paginar(bd, consulta, pag)


@router.post("", response_model=DonacionSalida, status_code=status.HTTP_201_CREATED)
def crear(datos: DonacionNueva, bd: BD, admin: Admin) -> Donacion:
    donacion = servicio.crear_donacion(bd, datos, admin)
    bd.commit()
    return donacion


@router.get("/{donacion_id}", response_model=DonacionSalida)
def ver(donacion_id: str, bd: BD, _: UsuarioActual) -> Donacion:
    return _buscar(bd, donacion_id)


@router.patch("/{donacion_id}", response_model=DonacionSalida)
def actualizar(donacion_id: str, datos: DonacionCambios, bd: BD, admin: Admin) -> Donacion:
    donacion = servicio.actualizar_donacion(
        bd, _buscar(bd, donacion_id, bloquear=True), datos, admin
    )
    bd.commit()
    return donacion


@router.post("/{donacion_id}/anular", response_model=DonacionSalida)
def anular(donacion_id: str, bd: BD, admin: Admin) -> Donacion:
    donacion = servicio.anular_donacion(bd, _buscar(bd, donacion_id, bloquear=True), admin)
    bd.commit()
    return donacion
