"""Motor y sesiones de SQLAlchemy."""

from collections.abc import Iterator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy import Engine, MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, Session

from app.config import obtener_ajustes


class Base(DeclarativeBase):
    """Clase base de todos los modelos."""

    # Nombres fijos para índices y restricciones, así las migraciones pueden referirse a ellos.
    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(column_0_label)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )


@lru_cache
def obtener_motor() -> Engine:
    # pool_pre_ping: Neon suspende la base sin uso y cierra las conexiones abiertas.
    # prepare_threshold=None: la conexión con pool de Neon (PgBouncer) reparte cada transacción
    # a una conexión distinta, y las sentencias preparadas de psycopg no sobreviven a eso.
    return create_engine(
        obtener_ajustes().database_url,
        pool_pre_ping=True,
        connect_args={"prepare_threshold": None},
    )


def obtener_bd() -> Iterator[Session]:
    with Session(obtener_motor()) as bd:
        yield bd


BD = Annotated[Session, Depends(obtener_bd)]
