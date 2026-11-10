"""Reglas de las donaciones."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errores import Conflicto, DatoInvalido, NoEncontrado
from app.models import (
    Categoria,
    Donacion,
    DonacionComprobante,
    Donante,
    ItemDonacion,
    Usuario,
)
from app.models.donacion import EstadoDonacion
from app.schemas.categoria import CategoriaNueva
from app.schemas.donacion import DonacionCambios, DonacionNueva, ItemNuevo
from app.services import categorias, imagenes
from app.services.auditoria import registrar
from app.services.comun import aplicar_cambios, marcar_autor, resolver_sede
from app.tiempo import hoy

COLUMNAS = {"notes": "notas"}


def _buscar_donante(bd: Session, donante_id: str) -> Donante:
    donante = bd.get(Donante, donante_id)
    if donante is None:
        raise DatoInvalido("donorId", f"No existe el donante {donante_id!r}")
    # Solo se rechaza al elegirlo: las donaciones ya registradas se conservan.
    if not donante.activo:
        raise Conflicto(
            f"El donante {donante.nombre!r} está inactivo y no puede recibir donaciones"
        )
    return donante


def _exigir_fecha_valida(fecha) -> None:
    if fecha > hoy():
        raise DatoInvalido("donationDate", "La fecha de la donación no puede ser futura")


def _categoria_del_item(bd: Session, datos: ItemNuevo, autor: Usuario) -> Categoria | None:
    if datos.category_id:
        categoria = bd.get(Categoria, datos.category_id)
        if categoria is None:
            raise DatoInvalido("categoryId", f"No existe la categoría {datos.category_id!r}")
        return categoria
    if datos.new_category:
        # Se reutiliza si ya existe una con ese nombre; si no, se crea aquí mismo.
        existente = bd.scalar(
            select(Categoria).where(func.lower(Categoria.nombre) == datos.new_category.lower())
        )
        if existente is not None:
            return existente
        return categorias.crear_categoria(bd, CategoriaNueva(name=datos.new_category), autor)
    return None


def _construir_items(bd: Session, datos: list[ItemNuevo], autor: Usuario) -> list[ItemDonacion]:
    items = []
    for orden, item in enumerate(datos):
        categoria = _categoria_del_item(bd, item, autor)
        items.append(
            ItemDonacion(
                orden=orden,
                nombre=item.name,
                categoria=categoria,
                cantidad=item.quantity,
                estado=item.condition,
                valor_unitario=item.estimated_unit_value,
                descripcion=item.description,
            )
        )
    return items


def crear_donacion(bd: Session, datos: DonacionNueva, autor: Usuario) -> Donacion:
    donante = _buscar_donante(bd, datos.donor_id)
    sede = resolver_sede(bd, datos.sede)
    fecha = datos.donation_date or hoy()
    _exigir_fecha_valida(fecha)

    donacion = Donacion(
        donante=donante,
        sede=sede,
        fecha=fecha,
        notas=datos.notes,
        estado=EstadoDonacion.RECIBIDA,
        items=_construir_items(bd, datos.items, autor),
    )
    marcar_autor(donacion, autor, nuevo=True)
    bd.add(donacion)
    bd.flush()
    registrar(
        bd,
        autor,
        "crear",
        "donaciones",
        donacion.id,
        {"donante": donante.nombre, "sede": sede.nombre, "items": len(donacion.items)},
    )
    return donacion


def _tocar(donacion: Donacion, autor: Usuario) -> None:
    """Marca autor y fecha de cambio; los ítems no tocan la fila de la donación por sí solos."""
    marcar_autor(donacion, autor)
    donacion.actualizado_en = func.clock_timestamp()


def _exigir_recibida(donacion: Donacion) -> None:
    if donacion.estado != EstadoDonacion.RECIBIDA:
        raise Conflicto("La donación está anulada y no se puede modificar")


def actualizar_donacion(
    bd: Session, donacion: Donacion, datos: DonacionCambios, autor: Usuario
) -> Donacion:
    _exigir_recibida(donacion)
    cambios = aplicar_cambios(donacion, datos, COLUMNAS)
    if datos.donor_id is not None and datos.donor_id != donacion.donante_id:
        donante = _buscar_donante(bd, datos.donor_id)
        cambios["donante"] = [donacion.donante.nombre, donante.nombre]
        donacion.donante = donante
    if datos.sede is not None:
        sede = resolver_sede(bd, datos.sede)
        if sede.id != donacion.sede_id:
            cambios["sede"] = [donacion.sede.nombre, sede.nombre]
            donacion.sede = sede
    if datos.donation_date is not None:
        _exigir_fecha_valida(datos.donation_date)
        if datos.donation_date != donacion.fecha:
            cambios["fecha"] = [donacion.fecha.isoformat(), datos.donation_date.isoformat()]
            donacion.fecha = datos.donation_date
    if datos.items is not None:
        cambios["items"] = [len(donacion.items), len(datos.items)]
        donacion.items = _construir_items(bd, datos.items, autor)
    if cambios:
        _tocar(donacion, autor)
        registrar(bd, autor, "actualizar", "donaciones", donacion.id, cambios)
    return donacion


def anular_donacion(bd: Session, donacion: Donacion, autor: Usuario) -> Donacion:
    _exigir_recibida(donacion)
    donacion.estado = EstadoDonacion.ANULADA
    _tocar(donacion, autor)
    registrar(bd, autor, "anular", "donaciones", donacion.id)
    return donacion


def ruta_de_comprobante(donacion: Donacion) -> str:
    return f"/api/donaciones/{donacion.id}/comprobante"


def subir_comprobante(
    bd: Session, donacion: Donacion, contenido: bytes, autor: Usuario
) -> Donacion:
    _exigir_recibida(donacion)
    webp = imagenes.guardar_webp(bd, DonacionComprobante, "donacion_id", donacion.id, contenido)
    # La huella en la dirección hace que el navegador pida la imagen nueva al reemplazarla.
    donacion.comprobante = f"{ruta_de_comprobante(donacion)}?v={imagenes.huella(webp)}"
    _tocar(donacion, autor)
    registrar(bd, autor, "subir_comprobante", "donaciones", donacion.id, {"bytes": len(webp)})
    return donacion


def borrar_comprobante(bd: Session, donacion: Donacion, autor: Usuario) -> None:
    _exigir_recibida(donacion)
    fila = bd.get(DonacionComprobante, donacion.id)
    if fila is None:
        raise NoEncontrado("La donación no tiene comprobante")
    bd.delete(fila)
    donacion.comprobante = ""
    _tocar(donacion, autor)
    registrar(bd, autor, "borrar_comprobante", "donaciones", donacion.id)
