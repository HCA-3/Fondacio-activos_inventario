"""Donaciones."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import Select, func, or_, select

from app.busqueda import patron_de_busqueda
from app.db import BD
from app.errores import DatoInvalido, NoEncontrado
from app.models import Categoria, Donacion, ItemDonacion, Sede
from app.models.donacion import EstadoDonacion
from app.paginacion import Pag, paginar
from app.schemas.base import Pagina
from app.schemas.donacion import DonacionCambios, DonacionNueva, DonacionSalida
from app.security import Admin, UsuarioActual
from app.services import donaciones as servicio

router = APIRouter(prefix="/api/donaciones", tags=["donaciones"])

Filtro = Annotated[str | None, Query(max_length=100)]


def _buscar(bd: BD, donacion_id: str, *, bloquear: bool = False) -> Donacion:
    # Al escribir se bloquea la fila: dos cambios a la vez (editar y anular) no se cruzan.
    donacion = bd.get(Donacion, donacion_id, with_for_update=bloquear)
    if donacion is None:
        raise NoEncontrado("Donación no encontrada")
    return donacion


class FiltrosDeDonaciones:
    """Filtros de la lista. El historial de un donante es `?donante=<id>`."""

    def __init__(
        self,
        desde: date | None = None,
        hasta: date | None = None,
        donante: Filtro = None,
        sede: Filtro = None,
        estado: EstadoDonacion | None = None,
        categoria: Filtro = None,
        q: Filtro = None,
    ) -> None:
        self.desde = desde
        self.hasta = hasta
        if desde and hasta and desde > hasta:
            raise DatoInvalido("desde", "La fecha inicial no puede ser posterior a la final")
        self.donante = donante.strip() if donante else None
        self.sede = sede.strip() if sede else None
        self.estado = estado
        self.categoria = categoria.strip() if categoria else None
        self.q = q.strip() if q else ""

    def consulta(self) -> Select:
        consulta = select(Donacion)
        if self.desde:
            consulta = consulta.where(Donacion.fecha >= self.desde)
        if self.hasta:
            consulta = consulta.where(Donacion.fecha <= self.hasta)
        if self.donante:
            consulta = consulta.where(Donacion.donante_id == self.donante)
        if self.sede:
            consulta = consulta.where(
                Donacion.sede_id.in_(
                    select(Sede.id).where(
                        or_(Sede.id == self.sede, func.lower(Sede.nombre) == self.sede.lower())
                    )
                )
            )
        if self.estado:
            consulta = consulta.where(Donacion.estado == self.estado)
        if self.categoria or self.q:
            # Un solo EXISTS: categoría y texto deben coincidir en el mismo ítem, y una
            # donación con varios ítems que coinciden no sale repetida.
            item = select(ItemDonacion.id).where(ItemDonacion.donacion_id == Donacion.id)
            if self.categoria:
                item = item.where(
                    ItemDonacion.categoria_id.in_(
                        select(Categoria.id).where(
                            or_(
                                Categoria.id == self.categoria,
                                func.lower(Categoria.nombre) == self.categoria.lower(),
                            )
                        )
                    )
                )
            if self.q:
                patron = patron_de_busqueda(self.q)
                item = item.where(
                    or_(
                        ItemDonacion.nombre.ilike(patron, escape="\\"),
                        ItemDonacion.descripcion.ilike(patron, escape="\\"),
                    )
                )
            consulta = consulta.where(item.exists())
        return consulta


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
