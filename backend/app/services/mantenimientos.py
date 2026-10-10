"""Reglas de los mantenimientos y de cómo mueven el estado del equipo."""

from sqlalchemy.orm import Session

from app.errores import Conflicto
from app.models import Mantenimiento, Usuario
from app.models.equipo import EstadoEquipo
from app.models.mantenimiento import ESTADOS_ABIERTOS, EstadoMantenimiento
from app.schemas.mantenimiento import COLUMNAS, Cierre, MantenimientoCambios, MantenimientoNuevo
from app.services.auditoria import registrar
from app.services.comun import aplicar_cambios, marcar_autor, valores
from app.services.equipos import bloquear_equipo, estado_al_liberar
from app.tiempo import hoy


def crear_mantenimiento(
    bd: Session, datos: MantenimientoNuevo, autor: Usuario | None
) -> Mantenimiento:
    equipo = bloquear_equipo(bd, datos.asset_id)
    abierto = datos.status in ESTADOS_ABIERTOS
    if abierto and equipo.estado == EstadoEquipo.BAJA:
        raise Conflicto(f"El equipo {equipo.placa} está dado de baja")

    campos = valores(datos, COLUMNAS)
    campos["equipo_nombre"] = datos.asset_name or equipo.nombre
    campos["fecha_solicitud"] = datos.request_date or hoy()
    mantenimiento = Mantenimiento(
        **campos,
        equipo_id=equipo.id,
        equipo_placa=equipo.placa,
        estado=datos.status,
        # Solo un mantenimiento que se registra ya terminado trae fecha de realización.
        fecha_realizado=None if abierto else (datos.completion_date or hoy()),
    )
    marcar_autor(mantenimiento, autor, nuevo=True)
    bd.add(mantenimiento)

    # Si el equipo está prestado sigue figurando como prestado.
    if abierto and equipo.estado != EstadoEquipo.PRESTADO:
        equipo.estado = EstadoEquipo.MANTENIMIENTO
        marcar_autor(equipo, autor)

    bd.flush()
    registrar(
        bd,
        autor,
        "crear",
        "mantenimientos",
        mantenimiento.id,
        {"equipo": equipo.placa, "tipo": mantenimiento.tipo, "estado": mantenimiento.estado},
    )
    return mantenimiento


def actualizar_mantenimiento(
    bd: Session, mantenimiento: Mantenimiento, datos: MantenimientoCambios, autor: Usuario
) -> Mantenimiento:
    cambia_estado = datos.status is not None and datos.status != mantenimiento.estado
    if cambia_estado and mantenimiento.estado == EstadoMantenimiento.COMPLETADO:
        raise Conflicto("Un mantenimiento completado no se puede reabrir")
    if cambia_estado and datos.status == EstadoMantenimiento.COMPLETADO:
        raise Conflicto("Para completarlo usa la acción de completar mantenimiento")

    cambios = aplicar_cambios(mantenimiento, datos, COLUMNAS)
    if cambia_estado:
        cambios["estado"] = [mantenimiento.estado, datos.status]
        mantenimiento.estado = datos.status
    if cambios:
        marcar_autor(mantenimiento, autor)
        registrar(bd, autor, "actualizar", "mantenimientos", mantenimiento.id, cambios)
    return mantenimiento


def completar_mantenimiento(
    bd: Session, mantenimiento: Mantenimiento, datos: Cierre, autor: Usuario
) -> Mantenimiento:
    equipo = bloquear_equipo(bd, mantenimiento.equipo_id)
    bd.refresh(mantenimiento)
    if mantenimiento.estado == EstadoMantenimiento.COMPLETADO:
        raise Conflicto("Este mantenimiento ya estaba completado")

    mantenimiento.estado = EstadoMantenimiento.COMPLETADO
    mantenimiento.fecha_realizado = hoy()
    if datos.notes:
        mantenimiento.notas = "\n".join(filter(None, [mantenimiento.notas, datos.notes]))
    marcar_autor(mantenimiento, autor)
    bd.flush()

    # Solo se libera un equipo que estaba en mantenimiento; uno dado de baja se queda así.
    if equipo.estado in (EstadoEquipo.MANTENIMIENTO, EstadoEquipo.PRESTADO):
        equipo.estado = estado_al_liberar(bd, equipo, datos.new_asset_status)
        marcar_autor(equipo, autor)

    registrar(
        bd,
        autor,
        "completar",
        "mantenimientos",
        mantenimiento.id,
        {"equipo": equipo.placa, "estado_equipo": equipo.estado},
    )
    return mantenimiento
