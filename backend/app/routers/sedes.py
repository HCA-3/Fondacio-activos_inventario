"""Sedes."""

from fastapi import APIRouter, status
from sqlalchemy import select

from app.db import BD
from app.errores import NoEncontrado
from app.models import Sede
from app.paginacion import Pag, paginar
from app.schemas.base import Pagina
from app.schemas.sede import SedeCambios, SedeNueva, SedeSalida
from app.security import Admin, UsuarioActual
from app.services import sedes as servicio

router = APIRouter(prefix="/api/sedes", tags=["sedes"])


def _buscar(bd: BD, sede_id: str) -> Sede:
    sede = bd.get(Sede, sede_id)
    if sede is None:
        raise NoEncontrado("Sede no encontrada")
    return sede


@router.get("", response_model=Pagina[SedeSalida])
def listar(bd: BD, _: UsuarioActual, pag: Pag) -> dict:
    return paginar(bd, select(Sede).order_by(Sede.nombre), pag)


@router.post("", response_model=SedeSalida, status_code=status.HTTP_201_CREATED)
def crear(datos: SedeNueva, bd: BD, admin: Admin) -> Sede:
    sede = servicio.crear_sede(bd, datos, admin)
    bd.commit()
    return sede


@router.get("/{sede_id}", response_model=SedeSalida)
def ver(sede_id: str, bd: BD, _: UsuarioActual) -> Sede:
    return _buscar(bd, sede_id)


@router.patch("/{sede_id}", response_model=SedeSalida)
def actualizar(sede_id: str, datos: SedeCambios, bd: BD, admin: Admin) -> Sede:
    sede = servicio.actualizar_sede(bd, _buscar(bd, sede_id), datos, admin)
    bd.commit()
    return sede


@router.delete("/{sede_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar(sede_id: str, bd: BD, admin: Admin) -> None:
    servicio.borrar_sede(bd, _buscar(bd, sede_id), admin)
    bd.commit()
