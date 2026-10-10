"""Equipos del inventario, su historial, su foto y la exportación a Excel."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.db import BD
from app.errores import NoEncontrado
from app.models import (
    Equipo,
    EquipoImagen,
    EstadoEquipo,
    Mantenimiento,
    Prestamo,
    Sede,
    Usuario,
)
from app.paginacion import Pag, paginar
from app.schemas.base import Pagina
from app.schemas.equipo import EquipoCambios, EquipoDetalle, EquipoNuevo, EquipoResumen
from app.schemas.mantenimiento import MantenimientoSalida
from app.schemas.prestamo import PrestamoSalida
from app.security import Admin, UsuarioActual
from app.services import equipos as servicio
from app.services import imagenes
from app.services.exportacion import generar_excel
from app.tiempo import hoy

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

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


class FiltrosDeEquipos:
    """Filtros de la lista. La exportación a Excel usa los mismos."""

    def __init__(
        self,
        sede: Filtro = None,
        estado: EstadoEquipo | None = None,
        categoria: Filtro = None,
        tipo: Filtro = None,
        q: Filtro = None,
    ) -> None:
        self.sede = sede
        self.estado = estado
        self.categoria = categoria
        self.tipo = tipo
        self.q = q.strip() if q else ""

    def consulta(self) -> Select:
        consulta = select(Equipo)
        if self.sede:
            consulta = consulta.join(Sede).where(
                or_(Sede.id == self.sede, func.lower(Sede.nombre) == self.sede.lower())
            )
        if self.estado:
            consulta = consulta.where(Equipo.estado == self.estado)
        if self.categoria:
            consulta = consulta.where(func.lower(Equipo.categoria) == self.categoria.lower())
        if self.tipo:
            consulta = consulta.where(func.lower(Equipo.tipo_equipo) == self.tipo.lower())
        if self.q:
            patron = _patron(self.q)
            consulta = consulta.where(
                or_(
                    *(columna.ilike(patron, escape="\\") for columna in COLUMNAS_DE_BUSQUEDA),
                    *(
                        Equipo.ficha_tecnica[campo].astext.ilike(patron, escape="\\")
                        for campo in CAMPOS_DE_FICHA_DE_BUSQUEDA
                    ),
                )
            )
        return consulta


Filtros = Annotated[FiltrosDeEquipos, Depends()]


@router.get("", response_model=Pagina[EquipoResumen])
def listar(bd: BD, _: UsuarioActual, pag: Pag, filtros: Filtros) -> dict:
    return paginar(bd, filtros.consulta().order_by(Equipo.creado_en.desc(), Equipo.placa), pag)


# Va antes de /{equipo_id}: si no, "export.xlsx" se tomaría por el id de un equipo.
@router.get(
    "/export.xlsx",
    response_class=Response,
    responses={200: {"content": {XLSX: {}}, "description": "Libro de Excel"}},
)
def exportar(bd: BD, _: UsuarioActual, filtros: Filtros) -> Response:
    equipos = bd.scalars(filtros.consulta().order_by(Equipo.placa)).all()
    nombre = f"Inventario_Equipos_Fondacio_{hoy().isoformat()}.xlsx"
    return Response(
        generar_excel(equipos),
        media_type=XLSX,
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )


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


async def _leer_cuerpo(request: Request, maximo: int) -> bytes:
    """Lee el cuerpo sin pasarse del máximo, para no cargar en memoria un archivo enorme."""
    demasiado = HTTPException(
        status.HTTP_413_CONTENT_TOO_LARGE, f"La imagen supera los {maximo // (1024 * 1024)} MB"
    )
    declarado = request.headers.get("content-length", "")
    if declarado.isdigit() and int(declarado) > maximo:
        raise demasiado
    partes: list[bytes] = []
    total = 0
    async for parte in request.stream():
        total += len(parte)
        if total > maximo:
            raise demasiado
        partes.append(parte)
    return b"".join(partes)


def _guardar_imagen(bd: Session, equipo_id: str, contenido: bytes, admin: Usuario) -> Equipo:
    equipo = imagenes.guardar_imagen(bd, _buscar(bd, equipo_id), contenido, admin)
    bd.commit()
    # Se recarga aquí para que la respuesta no consulte la base desde el hilo principal.
    bd.refresh(equipo)
    _ = equipo.sede
    return equipo


@router.put(
    "/{equipo_id}/imagen",
    response_model=EquipoDetalle,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                tipo: {"schema": {"type": "string", "format": "binary"}}
                for tipo in ("image/jpeg", "image/png", "image/webp")
            },
        }
    },
)
async def subir_imagen(equipo_id: str, request: Request, bd: BD, admin: Admin) -> Equipo:
    """El cuerpo de la petición es el archivo de la imagen, sin formulario."""
    contenido = await _leer_cuerpo(request, imagenes.MAX_BYTES)
    # Reducir la imagen tarda; se hace fuera del hilo que atiende las demás peticiones.
    return await run_in_threadpool(_guardar_imagen, bd, equipo_id, contenido, admin)


@router.get(
    "/{equipo_id}/imagen",
    response_class=Response,
    responses={200: {"content": {"image/webp": {}}, "description": "La foto del equipo"}},
)
def ver_imagen(equipo_id: str, request: Request, bd: BD, _: UsuarioActual) -> Response:
    imagen = bd.get(EquipoImagen, equipo_id)
    if imagen is None:
        raise NoEncontrado("El equipo no tiene una foto subida")
    etag = f'"{imagenes.huella(imagen.contenido)}"'
    cabeceras = {
        "ETag": etag,
        # Con ?v= la dirección cambia al cambiar la foto, así que se puede guardar para siempre.
        "Cache-Control": "private, max-age=31536000, immutable"
        if "v" in request.query_params
        else "private, no-cache",
        "X-Content-Type-Options": "nosniff",
    }
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=status.HTTP_304_NOT_MODIFIED, headers=cabeceras)
    return Response(imagen.contenido, media_type=imagen.tipo, headers=cabeceras)


@router.delete("/{equipo_id}/imagen", status_code=status.HTTP_204_NO_CONTENT)
def borrar_imagen(equipo_id: str, bd: BD, admin: Admin) -> None:
    imagenes.borrar_imagen(bd, _buscar(bd, equipo_id), admin)
    bd.commit()
