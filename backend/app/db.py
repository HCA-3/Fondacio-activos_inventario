"""Motor y sesiones de SQLAlchemy."""

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session

from app.config import obtener_ajustes


class Base(DeclarativeBase):
    """Clase base de todos los modelos."""


@lru_cache
def obtener_motor() -> Engine:
    # pool_pre_ping: Neon suspende la base sin uso y cierra las conexiones abiertas.
    return create_engine(obtener_ajustes().database_url, pool_pre_ping=True)


def obtener_sesion() -> Iterator[Session]:
    with Session(obtener_motor()) as sesion:
        yield sesion
