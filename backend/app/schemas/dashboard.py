"""Esquema del panel. Conserva los nombres de DataStore.getDashboardStats() del frontend."""

from app.schemas.base import Salida


class Panel(Salida):
    total: int
    operativos: int
    prestados: int
    mantenimiento: int
    bodega: int
    baja: int
    total_value: float
    by_sede: dict[str, int]
    by_category: dict[str, int]
    active_loans_count: int
    overdue_loans_count: int
    pending_maint_count: int
