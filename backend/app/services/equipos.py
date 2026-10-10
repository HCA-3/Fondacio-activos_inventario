"""Reglas de los equipos y de su estado."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errores import Conflicto, DatoInvalido
from app.models import Equipo, EstadoEquipo, Mantenimiento, Prestamo, Usuario
from app.models.equipo import ESTADOS_DEL_SISTEMA
from app.models.mantenimiento import ESTADOS_ABIERTOS
from app.models.prestamo import EstadoPrestamo
from app.schemas.equipo import COLUMNAS, EquipoCambios, EquipoNuevo
from app.services.auditoria import registrar
from app.services.comun import aplicar_cambios, marcar_autor, resolver_sede, valores

ESTADO_AUTOMATICO = (
    "Ese estado lo pone el sistema al registrar un préstamo o un mantenimiento, no se elige a mano"
)


def bloquear_equipo(bd: Session, equipo_id: str, campo: str = "assetId") -> Equipo:
    """Trae el equipo y bloquea su fila hasta el commit, para que dos acciones no se crucen."""
    equipo = bd.get(Equipo, equipo_id, with_for_update=True)
    if equipo is None:
        raise DatoInvalido(campo, "No existe ese equipo")
    return equipo


def tiene_prestamo_activo(bd: Session, equipo: Equipo) -> bool:
    return bool(
        bd.scalar(
            select(Prestamo.id)
            .where(Prestamo.equipo_id == equipo.id, Prestamo.estado == EstadoPrestamo.ACTIVO)
            .limit(1)
        )
    )


def tiene_mantenimiento_abierto(
    bd: Session, equipo: Equipo, salvo: Mantenimiento | None = None
) -> bool:
    consulta = select(Mantenimiento.id).where(
        Mantenimiento.equipo_id == equipo.id, Mantenimiento.estado.in_(ESTADOS_ABIERTOS)
    )
    if salvo is not None:
        consulta = consulta.where(Mantenimiento.id != salvo.id)
    return bool(bd.scalar(consulta.limit(1)))


def estado_al_liberar(
    bd: Session, equipo: Equipo, pedido: str, salvo: Mantenimiento | None = None
) -> str:
    """Estado que le toca al equipo cuando termina un préstamo o un mantenimiento."""
    if tiene_prestamo_activo(bd, equipo):
        return EstadoEquipo.PRESTADO
    if tiene_mantenimiento_abierto(bd, equipo, salvo):
        return EstadoEquipo.MANTENIMIENTO
    return pedido


def _exigir_placa_libre(bd: Session, placa: str, salvo: Equipo | None = None) -> None:
    otro = bd.scalar(select(Equipo).where(Equipo.placa == placa))
    if otro is not None and otro is not salvo:
        raise Conflicto(f"Ya existe un equipo con la placa {placa}")


def crear_equipo(bd: Session, datos: EquipoNuevo, autor: Usuario | None) -> Equipo:
    if datos.status in ESTADOS_DEL_SISTEMA:
        raise Conflicto(ESTADO_AUTOMATICO)
    _exigir_placa_libre(bd, datos.code)
    equipo = Equipo(
        **valores(datos, COLUMNAS),
        sede_id=resolver_sede(bd, datos.sede).id,
        estado=datos.status,
        ficha_tecnica={k: v for k, v in datos.ficha().items() if v is not None},
    )
    marcar_autor(equipo, autor, nuevo=True)
    bd.add(equipo)
    bd.flush()
    registrar(bd, autor, "crear", "equipos", equipo.id, {"placa": equipo.placa})
    return equipo


def _cambiar_estado(bd: Session, equipo: Equipo, nuevo: str) -> None:
    if equipo.estado == EstadoEquipo.PRESTADO and tiene_prestamo_activo(bd, equipo):
        raise Conflicto("El equipo tiene un préstamo activo. Registra la devolución primero")
    if equipo.estado == EstadoEquipo.MANTENIMIENTO and tiene_mantenimiento_abierto(bd, equipo):
        raise Conflicto("El equipo tiene un mantenimiento abierto. Complétalo primero")
    if nuevo in ESTADOS_DEL_SISTEMA:
        raise Conflicto(ESTADO_AUTOMATICO)
    equipo.estado = nuevo


def actualizar_equipo(bd: Session, equipo: Equipo, datos: EquipoCambios, autor: Usuario) -> Equipo:
    if datos.code is not None:
        _exigir_placa_libre(bd, datos.code, salvo=equipo)
    sede = resolver_sede(bd, datos.sede) if datos.sede is not None else equipo.sede
    # El frontend reenvía el equipo entero al guardar: el mismo estado no cuenta como cambio.
    estado_anterior = equipo.estado
    if datos.status is not None and datos.status != equipo.estado:
        _cambiar_estado(bd, equipo, datos.status)

    cambios = aplicar_cambios(equipo, datos, COLUMNAS)
    if equipo.estado != estado_anterior:
        cambios["estado"] = [estado_anterior, equipo.estado]
    if sede.id != equipo.sede_id:
        cambios["sede"] = [equipo.sede.nombre, sede.nombre]
        equipo.sede = sede

    ficha = dict(equipo.ficha_tecnica)
    for clave, valor in datos.ficha().items():
        if valor is None:
            ficha.pop(clave, None)
        else:
            ficha[clave] = valor
    if ficha != equipo.ficha_tecnica:
        tocados = sorted(k for k in datos.ficha() if ficha.get(k) != equipo.ficha_tecnica.get(k))
        cambios["ficha_tecnica"] = tocados
        equipo.ficha_tecnica = ficha

    if cambios:
        marcar_autor(equipo, autor)
        registrar(bd, autor, "actualizar", "equipos", equipo.id, cambios)
    return equipo


def borrar_equipo(bd: Session, equipo: Equipo, autor: Usuario) -> None:
    prestamos = bd.scalar(
        select(func.count()).select_from(Prestamo).where(Prestamo.equipo_id == equipo.id)
    )
    mantenimientos = bd.scalar(
        select(func.count()).select_from(Mantenimiento).where(Mantenimiento.equipo_id == equipo.id)
    )
    if prestamos or mantenimientos:
        raise Conflicto(
            "El equipo tiene historial de préstamos o mantenimientos y no se puede borrar. "
            "Márcalo como dado de baja"
        )
    registrar(bd, autor, "borrar", "equipos", equipo.id, {"placa": equipo.placa})
    bd.delete(equipo)
