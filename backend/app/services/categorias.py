"""Reglas de las categorías."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errores import Conflicto
from app.models import Categoria, Usuario
from app.schemas.categoria import COLUMNAS, CategoriaCambios, CategoriaNueva
from app.services.auditoria import registrar
from app.services.comun import aplicar_cambios, marcar_autor, valores


def _exigir_nombre_libre(bd: Session, nombre: str, salvo: Categoria | None = None) -> None:
    otra = bd.scalar(select(Categoria).where(func.lower(Categoria.nombre) == nombre.lower()))
    if otra is not None and otra is not salvo:
        raise Conflicto(f"Ya existe una categoría llamada {otra.nombre!r}")


def crear_categoria(bd: Session, datos: CategoriaNueva, autor: Usuario | None) -> Categoria:
    _exigir_nombre_libre(bd, datos.name)
    categoria = Categoria(**valores(datos, COLUMNAS))
    marcar_autor(categoria, autor, nuevo=True)
    bd.add(categoria)
    bd.flush()
    registrar(bd, autor, "crear", "categorias", categoria.id, {"nombre": categoria.nombre})
    return categoria


def actualizar_categoria(
    bd: Session, categoria: Categoria, datos: CategoriaCambios, autor: Usuario
) -> Categoria:
    if datos.name is not None:
        _exigir_nombre_libre(bd, datos.name, salvo=categoria)
    cambios = aplicar_cambios(categoria, datos, COLUMNAS)
    if cambios:
        marcar_autor(categoria, autor)
        registrar(bd, autor, "actualizar", "categorias", categoria.id, cambios)
    return categoria


def borrar_categoria(bd: Session, categoria: Categoria, autor: Usuario) -> None:
    # Los ítems de donación que la usen quedarán sin categoría (ON DELETE SET NULL); no se borran.
    registrar(bd, autor, "borrar", "categorias", categoria.id, {"nombre": categoria.nombre})
    bd.delete(categoria)
