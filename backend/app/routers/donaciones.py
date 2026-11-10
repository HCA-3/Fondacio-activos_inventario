"""Donaciones."""

from fastapi import APIRouter, status
from sqlalchemy import select

from app.db import BD
from app.errores import NoEncontrado
from app.models import Donacion, Equipo
from app.paginacion import Pag, paginar
from app.schemas.base import Pagina
from app.schemas.donacion import DonacionCambios, DonacionNueva, DonacionSalida, EquipoDeItem
from app.schemas.equipo import EquipoDetalle
from app.security import Admin, UsuarioActual
from app.services import donaciones as servicio

router = APIRouter(prefix="/api/donaciones", tags=["donaciones"])


def _buscar(bd: BD, donacion_id: str, *, bloquear: bool = False) -> Donacion:
    # Al escribir se bloquea la fila: dos cambios a la vez (editar y anular) no se cruzan.
    donacion = bd.get(Donacion, donacion_id, with_for_update=bloquear)
    if donacion is None:
        raise NoEncontrado("Donación no encontrada")
    return donacion


@router.get("", response_model=Pagina[DonacionSalida])
def listar(bd: BD, _: UsuarioActual, pag: Pag) -> dict:
    consulta = select(Donacion).order_by(
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


@router.post(
    "/{donacion_id}/items/{item_id}/equipo",
    response_model=EquipoDetalle,
    status_code=status.HTTP_201_CREATED,
)
def convertir_en_equipo(
    donacion_id: str, item_id: str, datos: EquipoDeItem, bd: BD, admin: Admin
) -> Equipo:
    equipo = servicio.convertir_item_en_equipo(
        bd, _buscar(bd, donacion_id, bloquear=True), item_id, datos, admin
    )
    bd.commit()
    return equipo


@router.post("/{donacion_id}/anular", response_model=DonacionSalida)
def anular(donacion_id: str, bd: BD, admin: Admin) -> Donacion:
    donacion = servicio.anular_donacion(bd, _buscar(bd, donacion_id, bloquear=True), admin)
    bd.commit()
    return donacion
