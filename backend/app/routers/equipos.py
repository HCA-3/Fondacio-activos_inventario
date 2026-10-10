"""Equipos del inventario y su historial."""

from typing import Annotated

from fastapi import APIRouter, Query, status
from sqlalchemy import func, or_, select

from app.db import BD
from app.errores import NoEncontrado
from app.models import Equipo, EstadoEquipo, Mantenimiento, Prestamo, Sede
from app.paginacion import Pag, paginar
from app.schemas.base import Pagina
from app.schemas.equipo import EquipoCambios, EquipoDetalle, EquipoNuevo, EquipoResumen
from app.schemas.mantenimiento import MantenimientoSalida
from app.schemas.prestamo import PrestamoSalida
from app.security import Admin, UsuarioActual
from app.services import equipos as servicio

router = APIRouter(prefix="/api/equipos", tags=["equipos"])

# Dónde busca ?q=: las mismas columnas y campos de la ficha que revisaba el frontend.
COLUMNAS_DE_BUSQUEDA = (
    Equipo.placa,
    Equipo.marca,
    Equipo.modelo,
    Equipo.serial,
    Equipo.area,
    Equipo.responsable,
    Equipo.ubicacion,
)
CAMPOS_DE_FICHA_DE_BUSQUEDA = ("processor", "ip", "mac", "networkHostname", "os")

Filtro = Annotated[str | None, Query(max_length=100)]


def _patron(texto: str) -> str:
    seguro = texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{seguro}%"


def _buscar(bd: BD, equipo_id: str) -> Equipo:
    equipo = bd.get(Equipo, equipo_id)
    if equipo is None:
        raise NoEncontrado("Equipo no encontrado")
    return equipo


@router.get("", response_model=Pagina[EquipoResumen])
def listar(
    bd: BD,
    _: UsuarioActual,
    pag: Pag,
    sede: Filtro = None,
    estado: EstadoEquipo | None = None,
    categoria: Filtro = None,
    tipo: Filtro = None,
    q: Filtro = None,
) -> dict:
    consulta = select(Equipo)
    if sede:
        consulta = consulta.join(Sede).where(
            or_(Sede.id == sede, func.lower(Sede.nombre) == sede.lower())
        )
    if estado:
        consulta = consulta.where(Equipo.estado == estado)
    if categoria:
        consulta = consulta.where(func.lower(Equipo.categoria) == categoria.lower())
    if tipo:
        consulta = consulta.where(func.lower(Equipo.tipo_equipo) == tipo.lower())
    if q and q.strip():
        patron = _patron(q.strip())
        consulta = consulta.where(
            or_(
                *(columna.ilike(patron, escape="\\") for columna in COLUMNAS_DE_BUSQUEDA),
                *(
                    Equipo.ficha_tecnica[campo].astext.ilike(patron, escape="\\")
                    for campo in CAMPOS_DE_FICHA_DE_BUSQUEDA
                ),
            )
        )
    return paginar(bd, consulta.order_by(Equipo.creado_en.desc(), Equipo.placa), pag)


@router.post("", response_model=EquipoDetalle, status_code=status.HTTP_201_CREATED)
def crear(datos: EquipoNuevo, bd: BD, admin: Admin) -> Equipo:
    equipo = servicio.crear_equipo(bd, datos, admin)
    bd.commit()
    return equipo


@router.get("/{equipo_id}", response_model=EquipoDetalle)
def ver(equipo_id: str, bd: BD, _: UsuarioActual) -> Equipo:
    return _buscar(bd, equipo_id)


@router.patch("/{equipo_id}", response_model=EquipoDetalle)
def actualizar(equipo_id: str, datos: EquipoCambios, bd: BD, admin: Admin) -> Equipo:
    equipo = servicio.actualizar_equipo(bd, _buscar(bd, equipo_id), datos, admin)
    bd.commit()
    return equipo


@router.delete("/{equipo_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar(equipo_id: str, bd: BD, admin: Admin) -> None:
    servicio.borrar_equipo(bd, _buscar(bd, equipo_id), admin)
    bd.commit()


@router.get("/{equipo_id}/prestamos", response_model=Pagina[PrestamoSalida])
def historial_de_prestamos(equipo_id: str, bd: BD, _: UsuarioActual, pag: Pag) -> dict:
    equipo = _buscar(bd, equipo_id)
    consulta = (
        select(Prestamo)
        .where(Prestamo.equipo_id == equipo.id)
        .order_by(Prestamo.fecha_prestamo.desc(), Prestamo.creado_en.desc())
    )
    return paginar(bd, consulta, pag)


@router.get("/{equipo_id}/mantenimientos", response_model=Pagina[MantenimientoSalida])
def historial_de_mantenimientos(equipo_id: str, bd: BD, _: UsuarioActual, pag: Pag) -> dict:
    equipo = _buscar(bd, equipo_id)
    consulta = (
        select(Mantenimiento)
        .where(Mantenimiento.equipo_id == equipo.id)
        .order_by(Mantenimiento.fecha_solicitud.desc(), Mantenimiento.creado_en.desc())
    )
    return paginar(bd, consulta, pag)
