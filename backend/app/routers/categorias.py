"""Categorías de los ítems donados."""

from fastapi import APIRouter, status
from sqlalchemy import select

from app.db import BD
from app.errores import NoEncontrado
from app.models import Categoria
from app.paginacion import Pag, paginar
from app.schemas.base import Pagina
from app.schemas.categoria import CategoriaCambios, CategoriaNueva, CategoriaSalida
from app.security import Admin, UsuarioActual
from app.services import categorias as servicio

router = APIRouter(prefix="/api/categorias", tags=["categorías"])


def _buscar(bd: BD, categoria_id: str) -> Categoria:
    categoria = bd.get(Categoria, categoria_id)
    if categoria is None:
        raise NoEncontrado("Categoría no encontrada")
    return categoria


@router.get("", response_model=Pagina[CategoriaSalida])
def listar(bd: BD, _: UsuarioActual, pag: Pag, activa: bool | None = None) -> dict:
    """Con `activa=true` solo las que se ofrecen en formularios nuevos."""
    consulta = select(Categoria).order_by(Categoria.nombre)
    if activa is not None:
        consulta = consulta.where(Categoria.activa == activa)
    return paginar(bd, consulta, pag)


@router.post("", response_model=CategoriaSalida, status_code=status.HTTP_201_CREATED)
def crear(datos: CategoriaNueva, bd: BD, admin: Admin) -> Categoria:
    categoria = servicio.crear_categoria(bd, datos, admin)
    bd.commit()
    return categoria


@router.get("/{categoria_id}", response_model=CategoriaSalida)
def ver(categoria_id: str, bd: BD, _: UsuarioActual) -> Categoria:
    return _buscar(bd, categoria_id)


@router.patch("/{categoria_id}", response_model=CategoriaSalida)
def actualizar(categoria_id: str, datos: CategoriaCambios, bd: BD, admin: Admin) -> Categoria:
    categoria = servicio.actualizar_categoria(bd, _buscar(bd, categoria_id), datos, admin)
    bd.commit()
    return categoria


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar(categoria_id: str, bd: BD, admin: Admin) -> None:
    servicio.borrar_categoria(bd, _buscar(bd, categoria_id), admin)
    bd.commit()
