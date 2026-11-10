"""Reglas de las donaciones."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errores import Conflicto, DatoInvalido, NoEncontrado
from app.models import (
    Categoria,
    Donacion,
    DonacionComprobante,
    Donante,
    Equipo,
    ItemDonacion,
    Usuario,
)
from app.models.donacion import EstadoDonacion
from app.schemas.categoria import CategoriaNueva
from app.schemas.donacion import (
    DonacionCambios,
    DonacionNueva,
    EquipoDeItem,
    ItemCambio,
    ItemNuevo,
)
from app.services import categorias, equipos, imagenes
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


def _aplicar_item(
    item: ItemDonacion, orden: int, datos: ItemNuevo, categoria: Categoria | None
) -> None:
    item.orden = orden
    item.nombre = datos.name
    item.categoria = categoria
    item.cantidad = datos.quantity
    item.estado = datos.condition
    item.valor_unitario = datos.estimated_unit_value
    item.descripcion = datos.description


def _construir_items(bd: Session, datos: list[ItemNuevo], autor: Usuario) -> list[ItemDonacion]:
    items = []
    for orden, datos_item in enumerate(datos):
        item = ItemDonacion()
        _aplicar_item(item, orden, datos_item, _categoria_del_item(bd, datos_item, autor))
        items.append(item)
    return items


def _item_convertido_cambia(item: ItemDonacion, datos: ItemNuevo) -> bool:
    if datos.category_id:
        categoria_igual = datos.category_id == item.categoria_id
    elif datos.new_category:
        categoria_igual = datos.new_category.lower() == item.categoria_nombre.lower()
    else:
        categoria_igual = item.categoria_id is None
    return not (
        categoria_igual
        and datos.name == item.nombre
        and datos.quantity == item.cantidad
        and datos.condition == item.estado
        and datos.estimated_unit_value == item.valor_unitario
        and datos.description == item.descripcion
    )


def _reemplazar_items(
    bd: Session, donacion: Donacion, datos: list[ItemCambio], autor: Usuario
) -> None:
    """Los ítems con id se actualizan en su sitio, los demás se crean y los omitidos se quitan.

    Un ítem convertido en equipo no se puede quitar ni modificar.
    """
    actuales = {i.id: i for i in donacion.items}
    nuevos = []
    usados = set()
    for orden, datos_item in enumerate(datos):
        if not datos_item.id:
            item = ItemDonacion()
            _aplicar_item(item, orden, datos_item, _categoria_del_item(bd, datos_item, autor))
        else:
            item = actuales.get(datos_item.id)
            if item is None or datos_item.id in usados:
                raise DatoInvalido("items", f"El ítem {datos_item.id!r} no es de esta donación")
            usados.add(item.id)
            if item.equipo_id is None:
                _aplicar_item(item, orden, datos_item, _categoria_del_item(bd, datos_item, autor))
            elif datos_item.category_id and bd.get(Categoria, datos_item.category_id) is None:
                raise DatoInvalido(
                    "categoryId", f"No existe la categoría {datos_item.category_id!r}"
                )
            elif _item_convertido_cambia(item, datos_item):
                raise Conflicto(f"El ítem {item.nombre!r} ya es un equipo y no se puede modificar")
            else:
                item.orden = orden
        nuevos.append(item)
    for item in actuales.values():
        if item.id not in usados and item.equipo_id is not None:
            raise Conflicto(f"El ítem {item.nombre!r} ya es un equipo y no se puede quitar")
    donacion.items = nuevos


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
        _reemplazar_items(bd, donacion, datos.items, autor)
    if cambios:
        _tocar(donacion, autor)
        registrar(bd, autor, "actualizar", "donaciones", donacion.id, cambios)
    return donacion


def convertir_item_en_equipo(
    bd: Session, donacion: Donacion, item_id: str, datos: EquipoDeItem, autor: Usuario
) -> Equipo:
    _exigir_recibida(donacion)
    item = next((i for i in donacion.items if i.id == item_id), None)
    if item is None:
        raise NoEncontrado("Ítem no encontrado en esta donación")
    if item.equipo_id is not None:
        raise Conflicto(f"El ítem {item.nombre!r} ya se convirtió en equipo")
    if item.cantidad != 1:
        raise Conflicto("Solo se convierte en equipo un ítem de cantidad 1")
    if not datos.sede:
        datos = datos.model_copy(update={"sede": donacion.sede.nombre})
    equipo = equipos.crear_equipo(bd, datos, autor)
    item.equipo_id = equipo.id
    _tocar(donacion, autor)
    registrar(
        bd,
        autor,
        "convertir",
        "donaciones",
        donacion.id,
        {"item": item.nombre, "equipo": equipo.id, "placa": equipo.placa},
    )
    return equipo


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
