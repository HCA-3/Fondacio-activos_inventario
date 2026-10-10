"""Panel de control."""

from fastapi import APIRouter

from app.db import BD
from app.schemas.dashboard import Panel
from app.security import UsuarioActual
from app.services.dashboard import calcular_panel

router = APIRouter(prefix="/api/dashboard", tags=["panel"])


@router.get("", response_model=Panel)
def ver(bd: BD, _: UsuarioActual) -> dict:
    return calcular_panel(bd)
