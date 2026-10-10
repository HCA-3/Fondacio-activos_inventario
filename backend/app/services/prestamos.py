"""Reglas de los préstamos. Cada acción deja el préstamo y el equipo coherentes."""

from sqlalchemy.orm import Session

from app.errores import Conflicto
from app.models import Prestamo, Usuario
from app.models.equipo import ESTADOS_DISPONIBLES, EstadoEquipo
from app.models.prestamo import EstadoPrestamo
from app.schemas.prestamo import COLUMNAS, Devolucion, PrestamoCambios, PrestamoNuevo
from app.services.auditoria import registrar
from app.services.comun import aplicar_cambios, marcar_autor, resolver_sede, valores
from app.services.equipos import bloquear_equipo, estado_al_liberar, tiene_prestamo_activo
from app.tiempo import hoy


def crear_prestamo(bd: Session, datos: PrestamoNuevo, autor: Usuario | None) -> Prestamo:
    equipo = bloquear_equipo(bd, datos.asset_id)
    if equipo.estado not in ESTADOS_DISPONIBLES or tiene_prestamo_activo(bd, equipo):
        raise Conflicto(
            f"El equipo {equipo.placa} no está disponible para préstamo (estado: {equipo.estado})"
        )

    sede = resolver_sede(bd, datos.sede) if datos.sede else equipo.sede
    campos = valores(datos, COLUMNAS)
    campos["equipo_nombre"] = datos.asset_name or equipo.nombre
    campos["fecha_prestamo"] = datos.loan_date or hoy()
    prestamo = Prestamo(
        **campos,
        equipo_id=equipo.id,
        equipo_placa=equipo.placa,
        sede_id=sede.id,
        estado=EstadoPrestamo.ACTIVO,
    )
    marcar_autor(prestamo, autor, nuevo=True)
    bd.add(prestamo)

    equipo.estado = EstadoEquipo.PRESTADO
    equipo.responsable = prestamo.prestatario_nombre
    equipo.cargo_responsable = prestamo.prestatario_cargo
    marcar_autor(equipo, autor)

    bd.flush()
    registrar(
        bd,
        autor,
        "crear",
        "prestamos",
        prestamo.id,
        {"equipo": equipo.placa, "prestatario": prestamo.prestatario_nombre},
    )
    return prestamo


def actualizar_prestamo(
    bd: Session, prestamo: Prestamo, datos: PrestamoCambios, autor: Usuario
) -> Prestamo:
    sede = resolver_sede(bd, datos.sede) if datos.sede else None
    cambios = aplicar_cambios(prestamo, datos, COLUMNAS | {"return_notes": "notas_devolucion"})
    if sede is not None and sede.id != prestamo.sede_id:
        cambios["sede"] = [prestamo.sede_nombre, sede.nombre]
        prestamo.sede = sede

    if prestamo.estado == EstadoPrestamo.ACTIVO and cambios.keys() & {
        "prestatario_nombre",
        "prestatario_cargo",
    }:
        equipo = bloquear_equipo(bd, prestamo.equipo_id)
        equipo.responsable = prestamo.prestatario_nombre
        equipo.cargo_responsable = prestamo.prestatario_cargo

    if cambios:
        marcar_autor(prestamo, autor)
        registrar(bd, autor, "actualizar", "prestamos", prestamo.id, cambios)
    return prestamo


def devolver_prestamo(
    bd: Session, prestamo: Prestamo, datos: Devolucion, autor: Usuario
) -> Prestamo:
    equipo = bloquear_equipo(bd, prestamo.equipo_id)
    bd.refresh(prestamo)
    if prestamo.estado != EstadoPrestamo.ACTIVO:
        raise Conflicto("Este préstamo ya fue devuelto")

    prestamo.estado = EstadoPrestamo.DEVUELTO
    prestamo.fecha_devolucion = hoy()
    prestamo.notas_devolucion = datos.return_notes
    marcar_autor(prestamo, autor)
    bd.flush()

    equipo.estado = estado_al_liberar(bd, equipo, datos.new_asset_status)
    equipo.responsable = equipo.ubicacion or "En Sede"
    equipo.cargo_responsable = "Disponible en Sede"
    marcar_autor(equipo, autor)

    registrar(
        bd,
        autor,
        "devolver",
        "prestamos",
        prestamo.id,
        {"equipo": equipo.placa, "estado_equipo": equipo.estado},
    )
    return prestamo
