"""Totales del panel, calculados en la base."""

from typing import Any

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.models import (
    Donacion,
    Equipo,
    EstadoDonacion,
    EstadoEquipo,
    ItemDonacion,
    Mantenimiento,
    Prestamo,
    Sede,
)
from app.models.mantenimiento import ESTADOS_ABIERTOS
from app.models.prestamo import EstadoPrestamo
from app.tiempo import hoy


def calcular_panel(bd: Session) -> dict[str, Any]:
    por_estado = dict(bd.execute(select(Equipo.estado, func.count()).group_by(Equipo.estado)).all())
    por_sede = bd.execute(
        select(Sede.nombre, func.count(Equipo.id))
        .outerjoin(Equipo, Equipo.sede_id == Sede.id)
        .group_by(Sede.nombre)
        .order_by(Sede.nombre)
    )

    # Misma agrupación que hacía el frontend: las tablets van juntas, el resto por tipo.
    grupo = case(
        (or_(func.lower(Equipo.categoria) == "tablet", Equipo.placa.like("TAB%")), "TABLETS"),
        else_=func.coalesce(func.nullif(Equipo.tipo_equipo, ""), "Otros"),
    ).label("grupo")
    por_tipo = bd.execute(select(grupo, func.count()).group_by("grupo").order_by("grupo"))

    activos = (
        select(func.count()).select_from(Prestamo).where(Prestamo.estado == EstadoPrestamo.ACTIVO)
    )
    # El mes se cuenta con la fecha de la donación en hora de Colombia; las anuladas no cuentan.
    inicio_mes = hoy().replace(day=1)
    recibidas = Donacion.estado == EstadoDonacion.RECIBIDA
    donaciones_del_mes = (
        select(func.count()).select_from(Donacion).where(recibidas, Donacion.fecha >= inicio_mes)
    )
    items_recibidos = (
        select(func.coalesce(func.sum(ItemDonacion.cantidad), 0))
        .join(Donacion, Donacion.id == ItemDonacion.donacion_id)
        .where(recibidas, Donacion.fecha >= inicio_mes)
    )
    return {
        "total": sum(por_estado.values()),
        "operativos": por_estado.get(EstadoEquipo.OPERATIVO, 0),
        "prestados": por_estado.get(EstadoEquipo.PRESTADO, 0),
        "mantenimiento": por_estado.get(EstadoEquipo.MANTENIMIENTO, 0),
        "bodega": por_estado.get(EstadoEquipo.BODEGA, 0),
        "baja": por_estado.get(EstadoEquipo.BAJA, 0),
        "total_value": bd.scalar(select(func.coalesce(func.sum(Equipo.valor_estimado), 0))),
        "by_sede": dict(por_sede.all()),
        "by_category": dict(por_tipo.all()),
        "active_loans_count": bd.scalar(activos),
        "overdue_loans_count": bd.scalar(activos.where(Prestamo.fecha_devolucion_prevista < hoy())),
        "pending_maint_count": bd.scalar(
            select(func.count())
            .select_from(Mantenimiento)
            .where(Mantenimiento.estado.in_(ESTADOS_ABIERTOS))
        ),
        "donations_this_month": bd.scalar(donaciones_del_mes),
        "items_received_this_month": bd.scalar(items_recibidos),
    }
