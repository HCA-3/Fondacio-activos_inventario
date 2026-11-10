"""Donantes."""

from typing import Annotated

from fastapi import APIRouter, Query, status
from sqlalchemy import select

from app.busqueda import patron_de_busqueda
from app.db import BD
from app.errores import NoEncontrado
from app.models import Donante
from app.paginacion import Pag, paginar
from app.schemas.base import Pagina
from app.schemas.donante import DonanteCambios, DonanteNuevo, DonanteSalida
from app.security import Admin, UsuarioActual
from app.services import donantes as servicio

router = APIRouter(prefix="/api/donantes", tags=["donantes"])


def _buscar(bd: BD, donante_id: str) -> Donante:
    donante = bd.get(Donante, donante_id)
    if donante is None:
        raise NoEncontrado("Donante no encontrado")
    return donante


@router.get("", response_model=Pagina[DonanteSalida])
def listar(
    bd: BD,
    _: UsuarioActual,
    pag: Pag,
    activo: Annotated[bool | None, Query(description="Solo activos o solo inactivos")] = None,
    q: Annotated[str | None, Query(description="Texto en el nombre o el contacto")] = None,
) -> dict:
    consulta = select(Donante)
    if activo is not None:
        consulta = consulta.where(Donante.activo == activo)
    if q and q.strip():
        patron = patron_de_busqueda(q.strip())
        consulta = consulta.where(
            Donante.nombre.ilike(patron, escape="\\") | Donante.contacto.ilike(patron, escape="\\")
        )
    return paginar(bd, consulta.order_by(Donante.nombre), pag)


@router.post("", response_model=DonanteSalida, status_code=status.HTTP_201_CREATED)
def crear(datos: DonanteNuevo, bd: BD, admin: Admin) -> Donante:
    donante = servicio.crear_donante(bd, datos, admin)
    bd.commit()
    return donante


@router.get("/{donante_id}", response_model=DonanteSalida)
def ver(donante_id: str, bd: BD, _: UsuarioActual) -> Donante:
    return _buscar(bd, donante_id)


@router.patch("/{donante_id}", response_model=DonanteSalida)
def actualizar(donante_id: str, datos: DonanteCambios, bd: BD, admin: Admin) -> Donante:
    donante = servicio.actualizar_donante(bd, _buscar(bd, donante_id), datos, admin)
    bd.commit()
    return donante
